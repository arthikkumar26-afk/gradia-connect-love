import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Placement, BGVDocument } from '@/contexts/EmployerContext';
import { Upload, CheckCircle, XCircle, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { mockUploadBGVDocument, mockVerifyBGVDocument } from '@/utils/mockApi';

const REQUIRED_DOCUMENTS = [
  'ID Proof',
  'Address Proof',
  'Education Certificate',
  'Experience Letter',
] as const;

interface BGVSectionProps {
  placement: Placement;
  onUpdate: (placement: Placement) => void;
  isCandidate?: boolean;
}

export default function BGVSection({ placement, onUpdate, isCandidate = false }: BGVSectionProps) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [selectedType, setSelectedType] = useState<BGVDocument['type']>('ID Proof');
  const [fileName, setFileName] = useState('');
  const [verifyingDoc, setVerifyingDoc] = useState<string | null>(null);
  const [verifyComments, setVerifyComments] = useState('');

  const handleUpload = async () => {
    if (!fileName) {
      toast({ title: 'Error', description: 'Please enter a file name', variant: 'destructive' });
      return;
    }

    setUploading(true);
    try {
      const updated = await mockUploadBGVDocument(placement.id, {
        name: selectedType,
        type: selectedType,
        fileName,
      });
      
      onUpdate(updated);
      setFileName('');
      toast({ title: 'Success', description: 'Document uploaded successfully' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to upload document', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleVerify = async (documentId: string, status: 'verified' | 'rejected') => {
    setVerifyingDoc(documentId);
    try {
      const updated = await mockVerifyBGVDocument(placement.id, documentId, status, verifyComments);
      onUpdate(updated);
      setVerifyComments('');
      toast({ 
        title: 'Success', 
        description: `Document ${status}`,
        variant: status === 'verified' ? 'default' : 'destructive',
      });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to verify document', variant: 'destructive' });
    } finally {
      setVerifyingDoc(null);
    }
  };

  const getDocumentStatus = (docType: typeof REQUIRED_DOCUMENTS[number]) => {
    const doc = placement.bgvDocuments?.find((d) => d.type === docType);
    return doc?.status || 'missing';
  };

  const getDocumentBadgeColor = (status: string) => {
    if (status === 'verified') return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    if (status === 'rejected') return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
    if (status === 'pending') return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
    return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
  };

  return (
    <div className="border-t pt-6 space-y-6">
      <h3 className="font-semibold text-foreground">Background Verification (BGV)</h3>

      {/* Document Checklist */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-foreground">Required Documents</h4>
        {REQUIRED_DOCUMENTS.map((docType) => {
          const status = getDocumentStatus(docType);
          const doc = placement.bgvDocuments?.find((d) => d.type === docType);
          
          return (
            <div key={docType} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{docType}</p>
                  {doc && (
                    <p className="text-xs text-muted-foreground">{doc.fileName}</p>
                  )}
                </div>
              </div>
              <Badge className={getDocumentBadgeColor(status)}>{status}</Badge>
            </div>
          );
        })}
      </div>

      {/* Upload UI (Candidate View) */}
      {isCandidate && (
        <div className="space-y-3 p-4 border rounded-lg">
          <h4 className="text-sm font-medium text-foreground">Upload Document</h4>
          <div>
            <Label htmlFor="docType">Document Type</Label>
            <select
              id="docType"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as BGVDocument['type'])}
              className="w-full mt-1 px-3 py-2 bg-background border border-input rounded-md"
            >
              {REQUIRED_DOCUMENTS.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="fileName">File Name</Label>
            <Input
              id="fileName"
              type="text"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              placeholder="document.pdf"
            />
          </div>
          <Button onClick={handleUpload} disabled={uploading} className="w-full">
            <Upload className="w-4 h-4 mr-2" />
            {uploading ? 'Uploading...' : 'Upload Document'}
          </Button>
        </div>
      )}

      {/* Verification UI (Employer View) */}
      {!isCandidate && placement.bgvDocuments && placement.bgvDocuments.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-foreground">Verify Documents</h4>
          {placement.bgvDocuments
            .filter((doc) => doc.status === 'pending')
            .map((doc) => (
              <div key={doc.id} className="p-4 border rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{doc.type}</p>
                    <p className="text-xs text-muted-foreground">{doc.fileName}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Uploaded: {doc.uploadedAt}
                    </p>
                  </div>
                  <Badge className={getDocumentBadgeColor(doc.status)}>{doc.status}</Badge>
                </div>
                <div>
                  <Label htmlFor={`comments-${doc.id}`}>Comments (optional)</Label>
                  <Textarea
                    id={`comments-${doc.id}`}
                    value={verifyComments}
                    onChange={(e) => setVerifyComments(e.target.value)}
                    placeholder="Add verification comments..."
                    rows={2}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleVerify(doc.id, 'verified')}
                    disabled={verifyingDoc === doc.id}
                    className="flex-1"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Verify
                  </Button>
                  <Button
                    onClick={() => handleVerify(doc.id, 'rejected')}
                    disabled={verifyingDoc === doc.id}
                    variant="destructive"
                    className="flex-1"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Reject
                  </Button>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
