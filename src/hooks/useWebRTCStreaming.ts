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
  type: 'offer' | 'answer' | 'ice-candidate' | 'broadcaster-ready' | 'viewer-joined' | 'request-offer';
  data: any;
  from: string;
  to?: string;
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    // Free TURN servers for better NAT traversal
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    },
    {
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    },
    {
      urls: 'turn:openrelay.metered.ca:443?transport=tcp',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    }
  ],
  iceCandidatePoolSize: 10
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
  const broadcastReadyIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isChannelInitializedRef = useRef(false);

  // Create peer connection
  const createPeerConnection = useCallback((peerId: string): RTCPeerConnection => {
    console.log(`[WebRTC ${role}] Creating peer connection for: ${peerId}`);
    
    // Close existing connection if any
    const existingPc = peerConnectionsRef.current.get(peerId);
    if (existingPc) {
      existingPc.close();
      peerConnectionsRef.current.delete(peerId);
    }
    
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
        // Try to reconnect if viewer
        if (role === 'viewer') {
          console.log('[WebRTC viewer] Connection failed/disconnected, requesting new offer');
          // Close the failed connection
          pc.close();
          peerConnectionsRef.current.delete(peerId);
          
          setTimeout(() => {
            channelRef.current?.send({
              type: 'broadcast',
              event: 'signaling',
              payload: {
                type: 'request-offer',
                from: clientIdRef.current,
                data: {}
              }
            });
          }, 1000);
        }
      }
    };
    
    // Monitor ICE connection state for debugging
    pc.oniceconnectionstatechange = () => {
      console.log(`[WebRTC ${role}] ICE connection state: ${pc.iceConnectionState}`);
      if (pc.iceConnectionState === 'failed') {
        console.log(`[WebRTC ${role}] ICE failed, attempting restart`);
        if (role === 'broadcaster') {
          pc.restartIce();
        }
      }
    };

    pc.ontrack = (event) => {
      console.log(`[WebRTC ${role}] Received remote track:`, event.track.kind, 'enabled:', event.track.enabled);
      console.log(`[WebRTC ${role}] Track readyState:`, event.track.readyState);
      
      // Monitor track state changes
      event.track.onended = () => {
        console.log(`[WebRTC ${role}] Track ${event.track.kind} ended - requesting reconnect`);
        // Request a new offer if track ends
        if (role === 'viewer') {
          setTimeout(() => {
            channelRef.current?.send({
              type: 'broadcast',
              event: 'signaling',
              payload: {
                type: 'request-offer',
                from: clientIdRef.current,
                data: {}
              }
            });
          }, 1000);
        }
      };
      event.track.onmute = () => {
        console.log(`[WebRTC ${role}] Track ${event.track.kind} muted`);
      };
      event.track.onunmute = () => {
        console.log(`[WebRTC ${role}] Track ${event.track.kind} unmuted`);
      };
      
      if (event.streams[0]) {
        console.log(`[WebRTC ${role}] Stream has ${event.streams[0].getTracks().length} tracks`);
        
        // Clone the stream to ensure we get fresh references
        const clonedStream = new MediaStream();
        event.streams[0].getTracks().forEach(track => {
          clonedStream.addTrack(track);
        });
        
        onStreamReceived?.(clonedStream);
      }
    };

    // Monitor for negotiation needed
    pc.onnegotiationneeded = () => {
      console.log(`[WebRTC ${role}] Negotiation needed`);
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

    console.log('[WebRTC broadcaster] Creating offer for viewer:', viewerId);
    const pc = createPeerConnection(viewerId);

    // Add local tracks
    localStreamRef.current.getTracks().forEach(track => {
      console.log(`[WebRTC broadcaster] Adding track: ${track.kind}`);
      pc.addTrack(track, localStreamRef.current!);
    });

    try {
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
    } catch (error) {
      console.error('[WebRTC broadcaster] Error creating offer:', error);
      onError?.(error as Error);
    }
  }, [createPeerConnection, onError]);

  // Viewer: Handle incoming offer
  const handleOffer = useCallback(async (broadcasterId: string, offerData: RTCSessionDescriptionInit) => {
    console.log('[WebRTC viewer] Handling offer from broadcaster:', broadcasterId);
    const pc = createPeerConnection(broadcasterId);

    try {
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
    } catch (error) {
      console.error('[WebRTC viewer] Error handling offer:', error);
      onError?.(error as Error);
    }
  }, [createPeerConnection, onError]);

  // Broadcaster: Handle incoming answer
  const handleAnswer = useCallback(async (viewerId: string, answerData: RTCSessionDescriptionInit) => {
    const pc = peerConnectionsRef.current.get(viewerId);
    if (pc && pc.signalingState === 'have-local-offer') {
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(answerData));
        console.log('[WebRTC broadcaster] Answer processed successfully');
      } catch (error) {
        console.error('[WebRTC broadcaster] Error processing answer:', error);
      }
    } else {
      console.warn('[WebRTC broadcaster] Cannot process answer, invalid state:', pc?.signalingState);
    }
  }, []);

  // Handle ICE candidate
  const handleIceCandidate = useCallback(async (peerId: string, candidateData: RTCIceCandidateInit) => {
    const pc = peerConnectionsRef.current.get(peerId);
    if (pc && pc.remoteDescription) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidateData));
      } catch (error) {
        console.error(`[WebRTC ${role}] Error adding ICE candidate:`, error);
      }
    } else {
      console.log(`[WebRTC ${role}] Queuing ICE candidate, no remote description yet`);
    }
  }, [role]);

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
        case 'request-offer':
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
            console.log('[WebRTC viewer] Broadcaster is ready, requesting offer');
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
  }, [role, createOfferForViewer, handleOffer, handleAnswer, handleIceCandidate, onError]);

  // Initialize Supabase Realtime channel for signaling
  const initChannel = useCallback(() => {
    if (isChannelInitializedRef.current || !sessionId) {
      console.log(`[WebRTC ${role}] Channel already initialized or no sessionId`);
      return channelRef.current;
    }
    
    console.log(`[WebRTC ${role}] Initializing channel for session: ${sessionId}`);
    isChannelInitializedRef.current = true;
    
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
        // If broadcaster with stream, create offer for new viewer
        if (role === 'broadcaster' && localStreamRef.current) {
          const newViewers = (newPresences as any[]).filter(p => p.role === 'viewer');
          newViewers.forEach(viewer => {
            console.log('[WebRTC broadcaster] New viewer joined via presence, creating offer');
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
          
          // If viewer, announce joining immediately and keep retrying
          if (role === 'viewer') {
            console.log('[WebRTC viewer] Announcing viewer-joined');
            channel.send({
              type: 'broadcast',
              event: 'signaling',
              payload: {
                type: 'viewer-joined',
                from: clientIdRef.current,
                data: {}
              }
            });
            
            // More aggressive retry logic for viewer - keep requesting until connected
            let retryCount = 0;
            const maxRetries = 20; // 20 retries = 60 seconds total
            const requestInterval = setInterval(() => {
              const hasActiveConnection = Array.from(peerConnectionsRef.current.values()).some(
                pc => pc.connectionState === 'connected' || pc.connectionState === 'connecting'
              );
              
              if (hasActiveConnection) {
                console.log('[WebRTC viewer] Connection established, stopping retries');
                clearInterval(requestInterval);
              } else if (retryCount < maxRetries) {
                retryCount++;
                console.log(`[WebRTC viewer] Requesting offer (attempt ${retryCount}/${maxRetries})...`);
                channel.send({
                  type: 'broadcast',
                  event: 'signaling',
                  payload: {
                    type: 'viewer-joined',
                    from: clientIdRef.current,
                    data: {}
                  }
                });
                // Also send request-offer as backup
                channel.send({
                  type: 'broadcast',
                  event: 'signaling',
                  payload: {
                    type: 'request-offer',
                    from: clientIdRef.current,
                    data: {}
                  }
                });
              } else {
                console.log('[WebRTC viewer] Max retries reached');
                clearInterval(requestInterval);
              }
            }, 3000);
          }
        }
      });

    channelRef.current = channel;
    return channel;
  }, [sessionId, role, handleSignalingMessage, createOfferForViewer]);

  // Start broadcasting
  const startBroadcasting = useCallback(async (stream: MediaStream) => {
    console.log('[WebRTC broadcaster] Starting broadcast with stream:', stream.id);
    console.log('[WebRTC broadcaster] Stream tracks:', stream.getTracks().map(t => `${t.kind}: ${t.enabled}, readyState: ${t.readyState}`));
    
    // Verify stream tracks are active
    const activeTracks = stream.getTracks().filter(t => t.enabled && t.readyState === 'live');
    if (activeTracks.length === 0) {
      console.error('[WebRTC broadcaster] No active tracks in stream!');
      return;
    }
    
    localStreamRef.current = stream;
    
    if (!channelRef.current) {
      initChannel();
    }

    // Wait a bit for channel to be fully ready
    await new Promise(resolve => setTimeout(resolve, 500));

    // Announce broadcaster ready periodically to catch late-joining viewers
    broadcastReadyIntervalRef.current = setInterval(() => {
      if (localStreamRef.current) {
        console.log('[WebRTC broadcaster] Broadcasting ready announcement');
        channelRef.current?.send({
          type: 'broadcast',
          event: 'signaling',
          payload: {
            type: 'broadcaster-ready',
            from: clientIdRef.current,
            data: {}
          }
        });
      }
    }, 3000); // More frequent announcements

    // Initial announcement with slight delay
    setTimeout(() => {
      console.log('[WebRTC broadcaster] Initial ready announcement');
      channelRef.current?.send({
        type: 'broadcast',
        event: 'signaling',
        payload: {
          type: 'broadcaster-ready',
          from: clientIdRef.current,
          data: {}
        }
      });
    }, 500);

    setIsStreaming(true);
  }, [initChannel]);

  // Stop broadcasting
  const stopBroadcasting = useCallback(() => {
    console.log('[WebRTC broadcaster] Stopping broadcast');
    
    if (broadcastReadyIntervalRef.current) {
      clearInterval(broadcastReadyIntervalRef.current);
      broadcastReadyIntervalRef.current = null;
    }
    
    peerConnectionsRef.current.forEach(pc => pc.close());
    peerConnectionsRef.current.clear();
    
    localStreamRef.current = null;
    setIsStreaming(false);
    setIsConnected(false);
    isChannelInitializedRef.current = false;
  }, []);

  // Start viewing (join as viewer)
  const startViewing = useCallback(() => {
    console.log('[WebRTC viewer] Starting to view session:', sessionId);
    if (!channelRef.current && !isChannelInitializedRef.current) {
      initChannel();
    }
  }, [sessionId, initChannel]);

  // Stop viewing
  const stopViewing = useCallback(() => {
    console.log('[WebRTC viewer] Stopping view');
    
    peerConnectionsRef.current.forEach(pc => pc.close());
    peerConnectionsRef.current.clear();
    
    setIsStreaming(false);
    setIsConnected(false);
    isChannelInitializedRef.current = false;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log(`[WebRTC ${role}] Cleaning up`);
      
      if (broadcastReadyIntervalRef.current) {
        clearInterval(broadcastReadyIntervalRef.current);
      }
      
      peerConnectionsRef.current.forEach(pc => pc.close());
      peerConnectionsRef.current.clear();
      channelRef.current?.unsubscribe();
      isChannelInitializedRef.current = false;
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
