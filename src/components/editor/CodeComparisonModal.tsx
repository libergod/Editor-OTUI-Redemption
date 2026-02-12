import { X, Check, AlertTriangle, Info, Download } from 'lucide-react';
import { OTUIValidationResult } from '@/lib/otui-validator';
import { t } from '@/lib/i18n';

interface CodeComparisonModalProps {
  onClose: () => void;
  onAcceptFixed: () => void;
  onKeepOriginal: () => void;
  originalCode: string;
  fixedCode: string;
  validation: OTUIValidationResult;
}

export function CodeComparisonModal({
  onClose,
  onAcceptFixed,
  onKeepOriginal,
  originalCode,
  fixedCode,
  validation
}: CodeComparisonModalProps) {
  const errorCount = validation.issues.filter(i => i.type === 'error').length;
  const warningCount = validation.issues.filter(i => i.type === 'warning').length;
  const infoCount = validation.issues.filter(i => i.type === 'info').length;

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-500';
    if (score >= 70) return 'text-yellow-500';
    if (score >= 50) return 'text-orange-500';
    return 'text-red-500';
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80" onClick={onClose}>
      <div
        className="relative w-[95vw] h-[90vh] bg-background border border-border rounded-lg shadow-xl flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold">{t('codeComparison.title')}</h2>
            <div className={`text-2xl font-bold ${getScoreColor(validation.score)}`}>
              {validation.score}/100
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Issues Summary */}
        <div className="px-4 py-3 bg-muted/30 border-b border-border flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <span className="font-semibold">{t('codeComparison.problems')}:</span>
          </div>
          {errorCount > 0 && (
            <div className="flex items-center gap-1 text-red-500">
              <AlertTriangle className="w-4 h-4" />
              <span>{errorCount} {errorCount !== 1 ? t('codeComparison.errors_plural') : t('codeComparison.errors')}</span>
            </div>
          )}
          {warningCount > 0 && (
            <div className="flex items-center gap-1 text-yellow-500">
              <AlertTriangle className="w-4 h-4" />
              <span>{warningCount} {warningCount !== 1 ? t('codeComparison.warnings_plural') : t('codeComparison.warnings')}</span>
            </div>
          )}
          {infoCount > 0 && (
            <div className="flex items-center gap-1 text-blue-500">
              <Info className="w-4 h-4" />
              <span>{infoCount} {infoCount !== 1 ? t('codeComparison.suggestions_plural') : t('codeComparison.suggestions')}</span>
            </div>
          )}
          {validation.issues.length === 0 && (
            <div className="flex items-center gap-1 text-green-500">
              <Check className="w-4 h-4" />
              <span>{t('codeComparison.noProblem')}</span>
            </div>
          )}
        </div>

        {/* Split View */}
        <div className="flex-1 flex overflow-hidden">
          {/* Original Code */}
          <div className="flex-1 flex flex-col border-r border-border">
            <div className="px-4 py-2 bg-red-500/10 border-b border-border flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <span className="font-semibold text-sm">{t('codeComparison.original')}</span>
            </div>
            <div className="flex-1 overflow-auto p-4 bg-muted/20">
              <pre className="text-xs font-mono text-foreground/90 whitespace-pre">
                {originalCode}
              </pre>
            </div>
          </div>

          {/* Fixed Code */}
          <div className="flex-1 flex flex-col">
            <div className="px-4 py-2 bg-green-500/10 border-b border-border flex items-center gap-2">
              <Check className="w-4 h-4 text-green-500" />
              <span className="font-semibold text-sm">{t('codeComparison.fixed')}</span>
            </div>
            <div className="flex-1 overflow-auto p-4 bg-muted/20">
              <pre className="text-xs font-mono text-foreground/90 whitespace-pre">
                {fixedCode}
              </pre>
            </div>
          </div>
        </div>

        {/* Issues List */}
        {validation.issues.length > 0 && (
          <div className="h-48 border-t border-border overflow-auto">
            <div className="px-4 py-2 bg-muted/30 border-b border-border">
              <span className="font-semibold text-sm">{t('codeComparison.details')}</span>
            </div>
            <div className="p-4 space-y-2">
              {validation.issues.map((issue, idx) => (
                <div
                  key={idx}
                  className={`flex items-start gap-3 p-2 rounded text-sm border ${
                    issue.type === 'error'
                      ? 'bg-red-500/5 border-red-500/20'
                      : issue.type === 'warning'
                      ? 'bg-yellow-500/5 border-yellow-500/20'
                      : 'bg-blue-500/5 border-blue-500/20'
                  }`}
                >
                  {issue.type === 'error' ? (
                    <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5" />
                  ) : issue.type === 'warning' ? (
                    <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5" />
                  ) : (
                    <Info className="w-4 h-4 text-blue-500 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <div className="font-mono text-xs text-muted-foreground mb-1">
                      {issue.widgetName}
                    </div>
                    <div>{issue.message}</div>
                    {issue.autoFixable && (
                      <div className="text-xs text-green-500 mt-1">✓ {t('codeComparison.autoFixed')}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="p-4 border-t border-border flex items-center justify-between bg-muted/10">
          <div className="text-sm text-muted-foreground">
            {validation.needsAutoFix
              ? t('codeComparison.message')
              : t('codeComparison.noFix')}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onKeepOriginal}
              className="px-4 py-2 text-sm border border-border rounded hover:bg-muted transition-colors"
            >
              {t('codeComparison.keepOriginal')}
            </button>
            <button
              onClick={onAcceptFixed}
              className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              {t('codeComparison.acceptFix')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
