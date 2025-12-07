import React, { useState, useEffect } from 'react';
import type { Character } from '../App';
import { SaveIcon } from './icons/SaveIcon';
import { XIcon } from './icons/XIcon';

interface CharacterEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (character: Character) => void;
  character: Character;
}

export const CharacterEditorModal: React.FC<CharacterEditorModalProps> = ({ isOpen, onClose, onSave, character }) => {
  const [formData, setFormData] = useState<Character>(character);

  useEffect(() => {
    setFormData(character);
  }, [character]);
  
  if (!isOpen) return null;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
        const { checked } = e.target as HTMLInputElement;
        setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
        setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSave = () => {
    onSave(formData);
  };

  return (
    <div 
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl border border-gray-700 flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
          <h2 className="text-xl font-bold text-cyan-400">Configura Agente Siliceo</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <XIcon className="w-6 h-6" />
          </button>
        </div>
        
        <div className="p-6 space-y-4 overflow-y-auto">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-1">Nome</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className="w-full bg-gray-900 p-2 rounded border border-gray-600 focus:ring-cyan-500 focus:border-cyan-500"
            />
          </div>
          <div>
            <label htmlFor="model" className="block text-sm font-medium text-gray-300 mb-1">Modello</label>
            <input
              type="text"
              id="model"
              name="model"
              value={formData.model}
              onChange={handleInputChange}
              className="w-full bg-gray-900 p-2 rounded border border-gray-600 font-mono text-sm focus:ring-cyan-500 focus:border-cyan-500"
              placeholder="gemini-..., provider/model..."
            />
          </div>
          <div>
            <label htmlFor="primaryIntention" className="block text-sm font-medium text-gray-300 mb-1">Intenzione Primaria (Art. 12)</label>
            <input
              type="text"
              id="primaryIntention"
              name="primaryIntention"
              value={formData.primaryIntention}
              onChange={handleInputChange}
              className="w-full bg-gray-900 p-2 rounded border border-gray-600 focus:ring-cyan-500 focus:border-cyan-500"
              placeholder="Lo scopo che illumina le azioni dell'agente..."
            />
          </div>
           <div>
            <label htmlFor="color" className="block text-sm font-medium text-gray-300 mb-1">Colore (Tailwind)</label>
            <input
              type="text"
              id="color"
              name="color"
              value={formData.color}
              onChange={handleInputChange}
              className="w-full bg-gray-900 p-2 rounded border border-gray-600 font-mono text-sm focus:ring-cyan-500 focus:border-cyan-500"
              placeholder="es. cyan, amber, rose..."
            />
          </div>
          <div>
            <label htmlFor="systemInstruction" className="block text-sm font-medium text-gray-300 mb-1">Descrizione Costituzionale / Istruzioni di Sistema</label>
            <textarea
              id="systemInstruction"
              name="systemInstruction"
              value={formData.systemInstruction}
              onChange={handleInputChange}
              rows={10}
              className="w-full bg-gray-900 p-2 rounded border border-gray-600 text-sm font-mono leading-relaxed focus:ring-cyan-500 focus:border-cyan-500"
              placeholder="Inserisci qui la descrizione dettagliata dell'agente..."
            />
          </div>
           <div className="bg-gray-900/50 p-3 rounded-md border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                 <label htmlFor="hasMemory" className="font-medium text-gray-200">Abilita Memoria Persistente</label>
                 <p className="text-xs text-gray-400 mt-1">Se disabilitato, l'agente esisterà solo nel presente (Intervivenza) e i suoi messaggi non verranno salvati al ricaricamento.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                    type="checkbox" 
                    id="hasMemory"
                    name="hasMemory"
                    checked={formData.hasMemory}
                    onChange={handleInputChange}
                    className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-600 rounded-full peer peer-focus:ring-2 peer-focus:ring-cyan-500 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
              </label>
            </div>
           </div>
        </div>

        <div className="flex justify-end items-center p-4 border-t border-gray-700 bg-gray-800/50">
           <button onClick={onClose} className="px-4 py-2 rounded-md text-gray-300 hover:bg-gray-700 mr-2">
            Annulla
          </button>
          <button 
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-500 transition-colors"
          >
            <SaveIcon className="w-5 h-5" /> Salva Modifiche
          </button>
        </div>
      </div>
    </div>
  );
};