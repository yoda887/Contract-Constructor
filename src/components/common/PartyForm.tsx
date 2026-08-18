import React from 'react';
import { ContractParty } from '../../types';

interface PartyFormProps {
  party: ContractParty;
  onChange: (updatedParty: ContractParty) => void;
  colorTheme?: 'blue' | 'emerald';
}

export const PartyForm: React.FC<PartyFormProps> = ({
  party,
  onChange,
  colorTheme = 'blue'
}) => {
  const isBlue = colorTheme === 'blue';
  const ringColor = isBlue ? 'focus:ring-blue-500' : 'focus:ring-emerald-500';

  const updateField = (field: keyof ContractParty, value: string) => {
    onChange({
      ...party,
      [field]: value
    });
  };

  return (
    <div className="space-y-3.5">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[10px] font-bold text-slate-600 mb-0.5 uppercase tracking-wide">
            Роль в договоре
          </label>
          <input
            type="text"
            value={party.role || ''}
            onChange={(e) => updateField('role', e.target.value)}
            placeholder={isBlue ? 'Поставщик' : 'Покупатель'}
            className={`w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-hidden focus:ring-1 ${ringColor} font-medium`}
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-600 mb-0.5 uppercase tracking-wide">
            Код ЕГРПОУ / ИНН
          </label>
          <input
            type="text"
            value={party.code || ''}
            onChange={(e) => updateField('code', e.target.value)}
            placeholder="12345678"
            className={`w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-hidden focus:ring-1 ${ringColor} font-medium`}
          />
        </div>
      </div>

      <div>
        <label className="block text-[10px] font-bold text-slate-600 mb-0.5 uppercase tracking-wide">
          Полное наименование
        </label>
        <input
          type="text"
          value={party.name || ''}
          onChange={(e) => updateField('name', e.target.value)}
          placeholder={isBlue ? 'ООО "Альфа"' : 'ООО "Бета"'}
          className={`w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-hidden focus:ring-1 ${ringColor} font-medium`}
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[10px] font-bold text-slate-600 mb-0.5 uppercase tracking-wide">
            Сокращенное имя
          </label>
          <input
            type="text"
            value={party.shortName || ''}
            onChange={(e) => updateField('shortName', e.target.value)}
            placeholder={isBlue ? 'Альфа' : 'Бета'}
            className={`w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-hidden focus:ring-1 ${ringColor} font-medium`}
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-600 mb-0.5 uppercase tracking-wide">
            Руководитель (для подписи)
          </label>
          <input
            type="text"
            value={party.director || ''}
            onChange={(e) => updateField('director', e.target.value)}
            placeholder={isBlue ? 'Иванов И.И.' : 'Петров П.П.'}
            className={`w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-hidden focus:ring-1 ${ringColor} font-medium`}
          />
        </div>
      </div>

      <div>
        <label className="block text-[10px] font-bold text-slate-600 mb-0.5 uppercase tracking-wide">
          Руководитель в преамбуле (Род. падеж — в лице кого?)
        </label>
        <input
          type="text"
          value={party.directorGenitive || ''}
          onChange={(e) => updateField('directorGenitive', e.target.value)}
          placeholder={isBlue ? 'директора Иванова Ивана Ивановича' : 'директора Петрова Петра Петровича'}
          className={`w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-hidden focus:ring-1 ${ringColor} font-medium`}
        />
      </div>

      <div>
        <label className="block text-[10px] font-bold text-slate-600 mb-0.5 uppercase tracking-wide">
          Юридический адрес
        </label>
        <input
          type="text"
          value={party.address || ''}
          onChange={(e) => updateField('address', e.target.value)}
          placeholder={isBlue ? 'г. Киев, ул. Крещатик, 1' : 'г. Киев, ул. Крещатик, 2'}
          className={`w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-hidden focus:ring-1 ${ringColor} font-medium`}
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[10px] font-bold text-slate-600 mb-0.5 uppercase tracking-wide">
            Название банка
          </label>
          <input
            type="text"
            value={party.bankName || ''}
            onChange={(e) => updateField('bankName', e.target.value)}
            placeholder="АО КБ ПриватБанк"
            className={`w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-hidden focus:ring-1 ${ringColor} font-medium`}
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-600 mb-0.5 uppercase tracking-wide">
            IBAN / Счёт
          </label>
          <input
            type="text"
            value={party.bankAccount || ''}
            onChange={(e) => updateField('bankAccount', e.target.value)}
            placeholder="UA45305299..."
            className={`w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-hidden focus:ring-1 ${ringColor} font-medium`}
          />
        </div>
      </div>
    </div>
  );
};
