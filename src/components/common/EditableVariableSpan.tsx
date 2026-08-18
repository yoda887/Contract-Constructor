import React, { useState, useRef, useEffect } from 'react';
import { Check, X } from 'lucide-react';

interface EditableVariableSpanProps {
  varKey: string;
  value?: string;
  isRole?: boolean;
  isUnresolved?: boolean;
  rawPart?: string;
  onVariableChange?: (varKey: string, newValue: string) => void;
  className?: string;
  title?: string;
}

const cleanKey = (key: string) => key.toLowerCase().trim().replace(/^\[/, '').replace(/\]$/, '').trim();

export const EditableVariableSpan: React.FC<EditableVariableSpanProps> = ({
  varKey,
  value,
  isRole = false,
  isUnresolved = false,
  rawPart,
  onVariableChange,
  className = '',
  title
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value || '');
  const [isHoveredExternally, setIsHoveredExternally] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTempValue(value || '');
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    const targetKey = cleanKey(varKey);
    const handleGlobalHover = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && customEvent.detail.key === targetKey) {
        setIsHoveredExternally(customEvent.detail.hovered);
      }
    };
    window.addEventListener('variable-hover', handleGlobalHover);
    return () => {
      window.removeEventListener('variable-hover', handleGlobalHover);
    };
  }, [varKey]);

  const triggerHover = (hovered: boolean) => {
    window.dispatchEvent(
      new CustomEvent('variable-hover', {
        detail: { key: cleanKey(varKey), hovered }
      })
    );
  };

  const handleSave = () => {
    const trimmed = tempValue.trim();
    if (onVariableChange && trimmed !== value) {
      onVariableChange(varKey, trimmed);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setTempValue(value || '');
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <span className="inline-flex items-center gap-1 bg-amber-100/90 p-0.5 rounded border border-amber-400 shadow-sm my-0.5 align-middle whitespace-nowrap">
        <input
          ref={inputRef}
          type="text"
          value={tempValue}
          onChange={(e) => setTempValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onClick={(e) => e.stopPropagation()}
          className="bg-white text-slate-900 text-xs px-2 py-0.5 rounded border border-amber-300 font-bold focus:outline-none focus:ring-2 focus:ring-amber-500 min-w-[100px] max-w-[280px]"
          placeholder={`Значение [${varKey}]...`}
        />
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleSave();
          }}
          className="bg-amber-600 hover:bg-amber-700 text-white font-bold p-1 rounded transition-colors cursor-pointer"
          title="Сохранить (Enter)"
        >
          <Check className="w-3 h-3" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleCancel();
          }}
          className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold p-1 rounded transition-colors cursor-pointer"
          title="Отмена (Esc)"
        >
          <X className="w-3 h-3" />
        </button>
      </span>
    );
  }

  // Not editing mode
  if (!onVariableChange) {
    if (value) {
      if (isRole) {
        return (
          <span
            onMouseEnter={() => triggerHover(true)}
            onMouseLeave={() => triggerHover(false)}
            className={`font-semibold text-slate-900 transition-all rounded px-0.5 ${className} ${
              isHoveredExternally ? 'bg-blue-200 text-blue-950 scale-105 shadow-xs ring-2 ring-blue-400' : ''
            }`}
          >
            {value}
          </span>
        );
      }
      return (
        <span
          onMouseEnter={() => triggerHover(true)}
          onMouseLeave={() => triggerHover(false)}
          className={`var-highlight transition-all rounded px-0.5 ${className} ${
            isHoveredExternally ? 'ring-4 ring-amber-400 bg-amber-200/95 scale-105 shadow-md' : ''
          }`}
        >
          {value}
        </span>
      );
    }

    if (isRole) {
      return (
        <span
          onMouseEnter={() => triggerHover(true)}
          onMouseLeave={() => triggerHover(false)}
          className={`font-semibold text-slate-700 bg-slate-100 px-1 rounded border border-slate-200 transition-all ${className} ${
            isHoveredExternally ? 'bg-blue-200 text-blue-950 scale-105 shadow-xs ring-2 ring-blue-400' : ''
          }`}
        >
          {rawPart || `[${varKey}]`}
        </span>
      );
    }

    return (
      <span
        onMouseEnter={() => triggerHover(true)}
        onMouseLeave={() => triggerHover(false)}
        className={`bg-rose-100 text-rose-800 font-mono font-bold px-1 rounded border border-rose-200 transition-all ${className} ${
          isHoveredExternally ? 'ring-4 ring-rose-400 scale-105 shadow-md bg-rose-200' : ''
        }`}
        title={title || "Переменная не заполнена"}
      >
        {rawPart || `[${varKey}]`}
      </span>
    );
  }

  // Interactive mode (onVariableChange is provided)
  if (value) {
    if (isRole) {
      return (
        <span
          onMouseEnter={() => triggerHover(true)}
          onMouseLeave={() => triggerHover(false)}
          onClick={(e) => {
            e.stopPropagation();
            setIsEditing(true);
          }}
          title={title || `Кликните, чтобы изменить роль/переменную [${varKey}]`}
          className={`font-semibold text-slate-900 cursor-pointer hover:bg-blue-100/80 hover:text-blue-900 px-1 rounded transition-all whitespace-nowrap ${className} ${
            isHoveredExternally ? 'bg-blue-200 text-blue-950 scale-105 shadow-xs ring-2 ring-blue-400' : ''
          }`}
        >
          {value}
        </span>
      );
    }

    return (
      <span
        onMouseEnter={() => triggerHover(true)}
        onMouseLeave={() => triggerHover(false)}
        onClick={(e) => {
          e.stopPropagation();
          setIsEditing(true);
        }}
        title={title || `Кликните, чтобы изменить значение переменной [${varKey}]`}
        className={`var-highlight cursor-pointer hover:ring-2 hover:ring-amber-400 hover:bg-amber-200/90 transition-all px-1 py-0.5 rounded whitespace-nowrap ${className} ${
          isHoveredExternally ? 'ring-4 ring-amber-400 bg-amber-200/95 scale-105 shadow-md' : ''
        }`}
      >
        {value}
      </span>
    );
  }

  // Unresolved variable interactive mode
  return (
    <span
      onMouseEnter={() => triggerHover(true)}
      onMouseLeave={() => triggerHover(false)}
      onClick={(e) => {
        e.stopPropagation();
        setIsEditing(true);
      }}
      title={title || `Нажмите, чтобы заполнить переменную [${varKey}]`}
      className={`bg-rose-100 text-rose-800 hover:bg-rose-200 hover:ring-2 hover:ring-rose-400 font-mono font-bold px-1.5 py-0.5 rounded border border-rose-300 cursor-pointer transition-all whitespace-nowrap ${className} ${
        isHoveredExternally ? 'ring-4 ring-rose-400 scale-105 shadow-md bg-rose-200' : ''
      }`}
    >
      {rawPart || `[${varKey}]`}
    </span>
  );
};
