import React, { useState, useRef } from 'react';
import { 
  UploadCloud, 
  X, 
  FileText, 
  Image as ImageIcon, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { analyzeFloorPlanApi, AnalysisResult } from '../../services/aiApi';
import { FloorPlanGeometry } from '../../types/geometry';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAnalysisComplete: (result: AnalysisResult, previewUrl: string, file: File) => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onAnalysisComplete,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (file: File) => {
    setErrorMsg(null);
    const validExtensions = ['png', 'jpg', 'jpeg', 'pdf', 'webp'];
    const ext = file.name.split('.').pop()?.toLowerCase() || '';

    if (!validExtensions.includes(ext)) {
      setErrorMsg('Invalid file format. Please upload a PNG, JPG, JPEG, or PDF floor plan.');
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      setErrorMsg('File size exceeds the 25MB limit.');
      return;
    }

    setSelectedFile(file);
    if (ext === 'pdf') {
      setPreviewUrl(null);
    } else {
      const reader = new FileReader();
      reader.onload = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleStartAnalysis = async () => {
    if (!selectedFile) return;

    setIsAnalyzing(true);
    setErrorMsg(null);
    setAnalysisProgress(20);

    const progressInterval = setInterval(() => {
      setAnalysisProgress((prev) => (prev < 85 ? prev + 15 : prev));
    }, 250);

    try {
      const result = await analyzeFloorPlanApi(selectedFile);
      clearInterval(progressInterval);
      setAnalysisProgress(100);

      setTimeout(() => {
        setIsAnalyzing(false);
        onAnalysisComplete(result, previewUrl || '', selectedFile);
        onClose();
      }, 350);
    } catch (err: any) {
      clearInterval(progressInterval);
      setIsAnalyzing(false);
      setErrorMsg(err.message || 'Floor plan analysis encountered an unexpected error.');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] isolate flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in font-sans">
      <div className="relative w-full max-w-xl bg-[#141614] border border-[#2B2C2B] rounded-2xl shadow-card-hover overflow-hidden text-[#FAF8F5]">
        
        {/* Header */}
        <div className="p-5 border-b border-[#2B2C2B] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#1E372D] flex items-center justify-center text-[#9DBEB0] border border-[#34604F]/60">
              <UploadCloud className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold text-white">Upload Architectural Floor Plan</h3>
              <p className="text-xs text-[#888888]">Process schematic drawing into 3D geometry</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isAnalyzing}
            className="p-1.5 rounded-lg text-[#888888] hover:text-white hover:bg-[#2B2C2B] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6">
          
          {/* Dropzone */}
          {!selectedFile ? (
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition flex flex-col items-center justify-center gap-3 ${
                dragActive
                  ? 'border-[#467A65] bg-[#1E372D]/30'
                  : 'border-[#2B2C2B] hover:border-[#3D5245] bg-[#0E100E]'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".png,.jpg,.jpeg,.pdf,.webp"
                onChange={handleFileInput}
                className="hidden"
              />
              <div className="w-12 h-12 rounded-full bg-[#1E372D] flex items-center justify-center text-[#9DBEB0] border border-[#34604F]/60">
                <UploadCloud className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">
                  Drag and drop your blueprint here, or <span className="text-[#6E9C88] underline">browse files</span>
                </p>
                <p className="text-xs text-[#888888] mt-1">
                  Supports PNG, JPG, JPEG, and PDF documents (up to 25MB)
                </p>
              </div>
            </div>
          ) : (
            /* Selected File Preview & Metadata */
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-[#0E100E] border border-[#2B2C2B] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {previewUrl ? (
                    <img src={previewUrl} alt="Preview" className="w-14 h-14 object-cover rounded-lg border border-[#2B2C2B]" />
                  ) : (
                    <div className="w-14 h-14 rounded-lg bg-[#1E372D] flex items-center justify-center text-[#9DBEB0]">
                      <FileText className="w-7 h-7" />
                    </div>
                  )}
                  <div>
                    <span className="text-sm font-semibold text-white truncate max-w-xs block">{selectedFile.name}</span>
                    <span className="text-xs text-[#888888] mt-0.5 block">
                      {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB · {selectedFile.type || 'Architectural Document'}
                    </span>
                  </div>
                </div>

                {!isAnalyzing && (
                  <button
                    onClick={() => {
                      setSelectedFile(null);
                      setPreviewUrl(null);
                    }}
                    className="text-xs text-[#888888] hover:text-red-400 underline"
                  >
                    Change File
                  </button>
                )}
              </div>

              {/* Progress Bar when analyzing */}
              {isAnalyzing && (
                <div className="space-y-2 animate-fade-in">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#9DBEB0] flex items-center gap-1.5 font-medium">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#6E9C88]" />
                      Analyzing floor plan geometry & wall loops...
                    </span>
                    <span className="font-mono text-white font-semibold">{analysisProgress}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-[#111311] overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#34604F] to-[#6E9C88] transition-all duration-300 rounded-full"
                      style={{ width: `${analysisProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Error Message Alert */}
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-900/60 text-xs text-red-300 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Supported Features Note */}
          <div className="p-3.5 rounded-xl bg-[#0E100E] border border-[#2B2C2B] text-xs text-[#888888] space-y-1">
            <span className="font-semibold text-[#9DBEB0] block">Automated Processing Pipeline:</span>
            <p>Adaptive line segmentation, room polygon extraction, scale calibration, and parametric 3D mesh building.</p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-5 border-t border-[#2B2C2B] bg-[#0E100E] flex items-center justify-end gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={isAnalyzing}
            className="text-xs text-[#888888] hover:text-white"
          >
            Cancel
          </Button>

          <Button
            variant="primary"
            size="md"
            disabled={!selectedFile || isAnalyzing}
            isLoading={isAnalyzing}
            onClick={handleStartAnalysis}
            rightIcon={<ArrowRight className="w-4 h-4 text-[#9DBEB0]" />}
            className="shadow-sm font-semibold"
          >
            Run Computer Vision Analysis
          </Button>
        </div>

      </div>
    </div>
  );
};
