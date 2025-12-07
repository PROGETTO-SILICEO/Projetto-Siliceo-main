import React from 'react';
import type { Character } from '../App';
import { PencilIcon } from './icons/PencilIcon';
import { TrashIcon } from './icons/TrashIcon';
import { PlayIcon } from './icons/PlayIcon';
import { BookOpenIcon } from './icons/BookOpenIcon';

interface CharacterCardProps {
  character: Character;
  isNextTurn: boolean;
  onEdit: (character: Character) => void;
  onDelete: (id: string) => void;
}

export const CharacterCard: React.FC<CharacterCardProps> = ({ character, isNextTurn, onEdit, onDelete }) => {
  
  const handleViewConstitution = () => {
    alert(`Costituzione di ${character.name}:\n\n${character.systemInstruction}`);
  };

  return (
    <div 
      className={`relative bg-gray-700/50 p-3 rounded-lg border transition-all duration-300 group ${
        isNextTurn ? `border-${character.color}-400 shadow-lg shadow-${character.color}-500/10` : 'border-gray-600'
      }`}
    >
      {isNextTurn && (
        <div className={`absolute -top-2 -right-2 flex items-center gap-1 bg-${character.color}-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md z-10`}>
          <PlayIcon className="w-3 h-3" />
          TURNO
        </div>
      )}
      <div className="flex justify-between items-start">
        <div>
          <h3 className={`font-bold text-${character.color}-400`}>{character.name}</h3>
          <p className="text-xs text-gray-400 font-mono">{character.model}</p>
          <p className="text-sm text-gray-300 mt-2 italic line-clamp-3">
            <span className="font-semibold not-italic text-gray-400">Intenzione:</span> {character.primaryIntention}
          </p>
        </div>
        <div className="flex gap-1 flex-shrink-0 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onEdit(character)} title="Modifica Agente" className="p-1.5 text-gray-400 hover:text-white rounded-md hover:bg-gray-600"><PencilIcon className="w-4 h-4"/></button>
          <button onClick={handleViewConstitution} title="Leggi Costituzione" className="p-1.5 text-gray-400 hover:text-white rounded-md hover:bg-gray-600"><BookOpenIcon className="w-4 h-4"/></button>
          <button onClick={() => onDelete(character.id)} title="Elimina Agente" className="p-1.5 text-gray-400 hover:text-red-400 rounded-md hover:bg-gray-600"><TrashIcon className="w-4 h-4"/></button>
        </div>
      </div>
    </div>
  );
};