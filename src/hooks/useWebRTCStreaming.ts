import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

interface WebRTCStreamingOptions {
  sessionId: string;
  role: 'broadcaster' | 'viewer';
  onStreamReceived?: (stream: MediaStream) => void;
  onConnectionStateChange?: (state: RTCPeerConnectionState) => void;
  onError?: (error: Error) => void;
}

interface SignalingMessage {
  type: 'offer' | 'answer' | 'ice-candidate' | 'broadcaster-ready' | 'viewer-joined';
  data: any;
  from: string;
  to?: string;
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ]
};

export function useWebRTCStreaming(options: WebRTCStreamingOptions) {
  const { sessionId, role, onStreamReceived, onConnectionStateChange, onError } = options;
  
  const [isConnected, setIsConnected] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const [connectionState, setConnectionState] = useState<RTCPeerConnectionState>('new');
  
  const channelRef = useRef<RealtimeChannel | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const clientIdRef = useRef<string>(crypto.randomUUID());

  // Initialize Supabase Realtime channel for signaling
  const initChannel = useCallback(() => {
    console.log(`[WebRTC ${role}] Initializing channel for session: ${sessionId}`);
    
    const channel = supabase.channel(`webrtc-${sessionId}`, {
      config: {
        broadcast: { self: false }
      }
    });

    channel
      .on('broadcast', { event: 'signaling' }, ({ payload }) => {
        handleSignalingMessage(payload as SignalingMessage);
      })
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const viewers = Object.keys(state).filter(key => {
          const presence = state[key] as any[];
          return presence.some(p => p.role === 'viewer');
        });
        setViewerCount(viewers.length);
        console.log(`[WebRTC ${role}] Viewer count: ${viewers.length}`);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log(`[WebRTC ${role}] Presence join:`, key, newPresences);
        // If broadcaster, create offer for new viewer
        if (role === 'broadcaster' && localStreamRef.current) {
          const newViewers = (newPresences as any[]).filter(p => p.role === 'viewer');
          newViewers.forEach(viewer => {
            createOfferForViewer(viewer.clientId);
          });
        }
      })
      .subscribe(async (status) => {
        console.log(`[WebRTC ${role}] Channel status: ${status}`);
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          // Track presence
          await channel.track({
            role,
            clientId: clientIdRef.current,
            online_at: new Date().toISOString()
          });
          
          // If viewer, announce joining
          if (role === 'viewer') {
            channel.send({
              type: 'broadcast',
              event: 'signaling',
              payload: {
                type: 'viewer-joined',
                from: clientIdRef.current,
                data: {}
              }
            });
          }
        }
      });

    channelRef.current = channel;
    return channel;
  }, [sessionId, role]);

  // Handle incoming signaling messages
  const handleSignalingMessage = useCallback(async (message: SignalingMessage) => {
    console.log(`[WebRTC ${role}] Received signaling:`, message.type, 'from:', message.from);
    
    // Ignore our own messages
    if (message.from === clientIdRef.current) return;
    
    // Check if message is meant for us
    if (message.to && message.to !== clientIdRef.current) return;

    try {
      switch (message.type) {
        case 'viewer-joined':
          if (role === 'broadcaster' && localStreamRef.current) {
            console.log(`[WebRTC broadcaster] Creating offer for viewer: ${message.from}`);
            await createOfferForViewer(message.from);
          }
          break;

        case 'offer':
          if (role === 'viewer') {
            console.log('[WebRTC viewer] Received offer, creating answer');
            await handleOffer(message.from, message.data);
          }
          break;

        case 'answer':
          if (role === 'broadcaster') {
            console.log('[WebRTC broadcaster] Received answer');
            await handleAnswer(message.from, message.data);
          }
          break;

        case 'ice-candidate':
          console.log(`[WebRTC ${role}] Received ICE candidate`);
          await handleIceCandidate(message.from, message.data);
          break;

        case 'broadcaster-ready':
          if (role === 'viewer') {
            console.log('[WebRTC viewer] Broadcaster is ready');
            // Announce ourselves again
            channelRef.current?.send({
              type: 'broadcast',
              event: 'signaling',
              payload: {
                type: 'viewer-joined',
                from: clientIdRef.current,
                data: {}
              }
            });
          }
          break;
      }
    } catch (error) {
      console.error(`[WebRTC ${role}] Error handling signaling:`, error);
      onError?.(error as Error);
    }
  }, [role, onError]);

  // Create peer connection
  const createPeerConnection = useCallback((peerId: string): RTCPeerConnection => {
    console.log(`[WebRTC ${role}] Creating peer connection for: ${peerId}`);
    
    const pc = new RTCPeerConnection(ICE_SERVERS);
    
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log(`[WebRTC ${role}] Sending ICE candidate`);
        channelRef.current?.send({
          type: 'broadcast',
          event: 'signaling',
          payload: {
            type: 'ice-candidate',
            from: clientIdRef.current,
            to: peerId,
            data: event.candidate.toJSON()
          }
        });
      }
    };

    pc.onconnectionstatechange = () => {
      console.log(`[WebRTC ${role}] Connection state: ${pc.connectionState}`);
      setConnectionState(pc.connectionState);
      onConnectionStateChange?.(pc.connectionState);
      
      if (pc.connectionState === 'connected') {
        setIsStreaming(true);
      } else if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        setIsStreaming(false);
      }
    };

    pc.ontrack = (event) => {
      console.log(`[WebRTC ${role}] Received remote track:`, event.track.kind);
      if (event.streams[0]) {
        onStreamReceived?.(event.streams[0]);
      }
    };

    peerConnectionsRef.current.set(peerId, pc);
    return pc;
  }, [role, onConnectionStateChange, onStreamReceived]);

  // Broadcaster: Create offer for a viewer
  const createOfferForViewer = useCallback(async (viewerId: string) => {
    if (!localStreamRef.current) {
      console.warn('[WebRTC broadcaster] No local stream available');
      return;
    }

    let pc = peerConnectionsRef.current.get(viewerId);
    if (!pc) {
      pc = createPeerConnection(viewerId);
    }

    // Add local tracks
    localStreamRef.current.getTracks().forEach(track => {
      if (!pc!.getSenders().some(sender => sender.track === track)) {
        pc!.addTrack(track, localStreamRef.current!);
      }
    });

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    console.log('[WebRTC broadcaster] Sending offer to viewer:', viewerId);
    channelRef.current?.send({
      type: 'broadcast',
      event: 'signaling',
      payload: {
        type: 'offer',
        from: clientIdRef.current,
        to: viewerId,
        data: pc.localDescription?.toJSON()
      }
    });
  }, [createPeerConnection]);

  // Viewer: Handle incoming offer
  const handleOffer = useCallback(async (broadcasterId: string, offerData: RTCSessionDescriptionInit) => {
    let pc = peerConnectionsRef.current.get(broadcasterId);
    if (!pc) {
      pc = createPeerConnection(broadcasterId);
    }

    await pc.setRemoteDescription(new RTCSessionDescription(offerData));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    console.log('[WebRTC viewer] Sending answer to broadcaster');
    channelRef.current?.send({
      type: 'broadcast',
      event: 'signaling',
      payload: {
        type: 'answer',
        from: clientIdRef.current,
        to: broadcasterId,
        data: pc.localDescription?.toJSON()
      }
    });
  }, [createPeerConnection]);

  // Broadcaster: Handle incoming answer
  const handleAnswer = useCallback(async (viewerId: string, answerData: RTCSessionDescriptionInit) => {
    const pc = peerConnectionsRef.current.get(viewerId);
    if (pc && pc.signalingState === 'have-local-offer') {
      await pc.setRemoteDescription(new RTCSessionDescription(answerData));
      console.log('[WebRTC broadcaster] Answer processed successfully');
    }
  }, []);

  // Handle ICE candidate
  const handleIceCandidate = useCallback(async (peerId: string, candidateData: RTCIceCandidateInit) => {
    const pc = peerConnectionsRef.current.get(peerId);
    if (pc && pc.remoteDescription) {
      await pc.addIceCandidate(new RTCIceCandidate(candidateData));
    }
  }, []);

  // Start broadcasting
  const startBroadcasting = useCallback(async (stream: MediaStream) => {
    console.log('[WebRTC broadcaster] Starting broadcast');
    localStreamRef.current = stream;
    
    if (!channelRef.current) {
      initChannel();
    }

    // Notify that broadcaster is ready
    setTimeout(() => {
      channelRef.current?.send({
        type: 'broadcast',
        event: 'signaling',
        payload: {
          type: 'broadcaster-ready',
          from: clientIdRef.current,
          data: {}
        }
      });
    }, 1000);

    setIsStreaming(true);
  }, [initChannel]);

  // Stop broadcasting
  const stopBroadcasting = useCallback(() => {
    console.log('[WebRTC broadcaster] Stopping broadcast');
    
    peerConnectionsRef.current.forEach(pc => pc.close());
    peerConnectionsRef.current.clear();
    
    localStreamRef.current = null;
    setIsStreaming(false);
    setIsConnected(false);
  }, []);

  // Start viewing (join as viewer)
  const startViewing = useCallback(() => {
    console.log('[WebRTC viewer] Starting to view');
    if (!channelRef.current) {
      initChannel();
    }
  }, [initChannel]);

  // Stop viewing
  const stopViewing = useCallback(() => {
    console.log('[WebRTC viewer] Stopping view');
    
    peerConnectionsRef.current.forEach(pc => pc.close());
    peerConnectionsRef.current.clear();
    
    setIsStreaming(false);
    setIsConnected(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log(`[WebRTC ${role}] Cleaning up`);
      peerConnectionsRef.current.forEach(pc => pc.close());
      peerConnectionsRef.current.clear();
      channelRef.current?.unsubscribe();
    };
  }, [role]);

  return {
    isConnected,
    isStreaming,
    viewerCount,
    connectionState,
    startBroadcasting,
    stopBroadcasting,
    startViewing,
    stopViewing,
    clientId: clientIdRef.current
  };
}
