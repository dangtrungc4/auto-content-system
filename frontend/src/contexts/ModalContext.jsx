import React, { createContext, useContext, useState, useCallback } from 'react';
import { AlertCircle, CheckCircle, Info, Trash2, X } from 'lucide-react';

const ModalContext = createContext(null);

export const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) throw new Error("useModal must be used within a ModalProvider");
  return context;
};

export const ModalProvider = ({ children }) => {
  const [modalState, setModalState] = useState({
    isOpen: false,
    type: 'alert', // 'alert' | 'confirm'
    variant: 'info', // 'info' | 'success' | 'error' | 'danger'
    title: '',
    message: '',
    onConfirm: null,
    onCancel: null,
    confirmText: 'Đóng',
    cancelText: 'Hủy',
  });

  const showAlert = useCallback((title, message, variant = 'info') => {
    setModalState({
      isOpen: true,
      type: 'alert',
      variant,
      title,
      message,
      confirmText: 'Đóng',
      onConfirm: () => setModalState(prev => ({ ...prev, isOpen: false })),
      onCancel: null
    });
  }, []);

  const showConfirm = useCallback((title, message, onConfirm, options = {}) => {
    const handleConfirm = () => {
      onConfirm();
      setModalState(prev => ({ ...prev, isOpen: false }));
    };

    const handleCancel = () => {
      if (options.onCancel) options.onCancel();
      setModalState(prev => ({ ...prev, isOpen: false }));
    };

    setModalState({
      isOpen: true,
      type: 'confirm',
      variant: options.variant || 'danger',
      title,
      message,
      confirmText: options.confirmText || 'Chắc chắn',
      cancelText: options.cancelText || 'Hủy',
      onConfirm: handleConfirm,
      onCancel: handleCancel
    });
  }, []);

  // For when clicking outside or 'X'
  const handleClose = () => {
    if (modalState.type === 'confirm' && modalState.onCancel) {
      modalState.onCancel();
    } else {
      setModalState(prev => ({ ...prev, isOpen: false }));
    }
  };

  return (
    <ModalContext.Provider value={{ showAlert, showConfirm }}>
      {children}
      
      {modalState.isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 text-center animate-in zoom-in-95 duration-200 overflow-hidden">
            
            <button 
              onClick={handleClose} 
              className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>

            {/* Icon section */}
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
              modalState.variant === 'danger' ? 'bg-red-500/10 text-red-500' :
              modalState.variant === 'error' ? 'bg-orange-500/10 text-orange-500' :
              modalState.variant === 'success' ? 'bg-emerald-500/10 text-emerald-500' :
              'bg-blue-500/10 text-blue-500'
            }`}>
              {modalState.variant === 'danger' ? <Trash2 size={32} /> : 
               modalState.variant === 'error' ? <AlertCircle size={32} /> :
               modalState.variant === 'success' ? <CheckCircle size={32} /> :
               <Info size={32} />}
            </div>
            
            <h3 className="text-xl font-bold text-slate-100 mb-2 whitespace-pre-wrap">
              {modalState.title}
            </h3>
            
            <p className="text-slate-400 text-sm mb-6 leading-relaxed whitespace-pre-wrap">
              {modalState.message}
            </p>
            
            <div className="flex gap-3 justify-center">
              {modalState.type === 'confirm' && (
                <button
                  onClick={modalState.onCancel}
                  className="flex-1 px-5 py-2.5 rounded-xl font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-all border border-slate-700 hover:border-slate-600 outline-none"
                >
                  {modalState.cancelText}
                </button>
              )}
              <button
                onClick={modalState.onConfirm}
                autoFocus
                className={`flex-1 px-5 py-2.5 rounded-xl font-bold text-white transition-all shadow-lg outline-none ${
                  modalState.variant === 'danger' ? 'bg-red-600 hover:bg-red-500 shadow-red-500/30' :
                  modalState.variant === 'error' ? 'bg-orange-600 hover:bg-orange-500 shadow-orange-500/30' :
                  modalState.variant === 'success' ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/30' :
                  'bg-blue-600 hover:bg-blue-500 shadow-blue-500/30'
                }`}
              >
                {modalState.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </ModalContext.Provider>
  );
};
