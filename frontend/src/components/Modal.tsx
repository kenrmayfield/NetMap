import React from "react";
import { X } from "lucide-react";

export function Modal({
  children,
  headerSubmitDisabled = false,
  headerSubmitFormId,
  headerSubmitLabel,
  onCancel,
  title,
  wide = false,
}: {
  children: React.ReactNode;
  headerSubmitDisabled?: boolean;
  headerSubmitFormId?: string;
  headerSubmitLabel?: string;
  onCancel: () => void;
  title: string;
  wide?: boolean;
}) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={title}>
      <div className={wide ? "modal modal--wide" : "modal"}>
        <div className="modal-header">
          <h3>{title}</h3>
          <div className="modal-header-actions">
            {headerSubmitLabel && headerSubmitFormId && (
              <button type="submit" className="ipam-btn ipam-btn--primary" form={headerSubmitFormId} disabled={headerSubmitDisabled}>
                {headerSubmitLabel}
              </button>
            )}
            <button type="button" className="modal-close-btn" onClick={onCancel} aria-label="Close">
              <X size={18} />
            </button>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
