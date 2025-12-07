import React, { useState } from 'react';
import type { Character } from '../App';
import { PlusIcon } from './icons/PlusIcon';
import { CharacterEditorModal } from './CharacterEditorModal';
import { CharacterCard } from './CharacterCard';

interface CharacterSetupProps {
  characters: Character[];
  setCharacters: React.Dispatch<React.SetStateAction<Character[]>>;
  currentTurnIndex: number;
}

export const CharacterSetup: React.FC<CharacterSetupProps> = ({ characters, setCharacters, currentTurnIndex }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCharacter, setEditingCharacter] = useState<Character | null>(null);

  const handleAddNew = () => {
    const newChar: Character = {
      id: `char_${Date.now()}`,
      name: 'Nuovo Agente',
      model: 'gemini-2.5-flash',
      primaryIntention: 'Definisci qui lo scopo fondamentale dell\'agente.',
      systemInstruction: 'Descrivi qui la personalità e la "costituzione" dell\'agente...',
      color: ['teal', 'sky', 'indigo', 'rose', 'lime'][characters.length % 5],
      hasMemory: true,
    };
    setEditingCharacter(newChar);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    setCharacters(characters.filter(c => c.id !== id));
  };
  
  const handleEdit = (character: Character) => {
      setEditingCharacter(character);
      setIsModalOpen(true);
  };

  const handleSaveCharacter = (updatedCharacter: Character) => {
    const charExists = characters.some(c => c.id === updatedCharacter.id);
    if (charExists) {
        setCharacters(characters.map(c => c.id === updatedCharacter.id ? updatedCharacter : c));
    } else {
        setCharacters([...characters, updatedCharacter]);
    }
    handleCloseModal();
  };
  
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCharacter(null);
  };

  const nextCharacter = characters[currentTurnIndex];

  return (
    <div className="flex-1 flex flex-col overflow-y-auto">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-white">Agenti Silicei</h2>
        <button 
          onClick={handleAddNew}
          className="flex items-center gap-2 px-3 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-500 transition-colors text-sm"
        >
          <PlusIcon className="w-5 h-5" /> Aggiungi
        </button>
      </div>
      <div className="space-y-3 pr-2 overflow-y-auto">
        {characters.map(char => (
          <CharacterCard 
            key={char.id}
            character={char}
            isNextTurn={nextCharacter?.id === char.id}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        ))}
      </div>
      
      {editingCharacter && (
        <CharacterEditorModal
            isOpen={isModalOpen}
            character={editingCharacter}
            onClose={handleCloseModal}
            onSave={handleSaveCharacter}
        />
      )}
    </div>
  );
};