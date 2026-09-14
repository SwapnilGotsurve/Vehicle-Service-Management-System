import { X } from 'lucide-react';

export default function Modal({ title, onClose, children, wide }) {
  return <div className="modal-backdrop"><div className={wide ? 'modal modal-wide' : 'modal'}><div className="modal-head"><h2>{title}</h2><button className="icon-button" onClick={onClose} aria-label="Close"><X size={18} /></button></div>{children}</div></div>;
}
