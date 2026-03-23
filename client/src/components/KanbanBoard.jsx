import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { useTranslation } from "react-i18next";
import { GripVertical, Clock, Briefcase, Mail, MapPin, DollarSign } from "lucide-react";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";

export default function KanbanBoard({ data, masterData, handleStatusChange, onCandidateClick }) {
    const { t } = useTranslation();
    const { user } = useContext(AuthContext);

const handleDragEnd = (result) => {
        if (!result.destination) return;

        const candidateId = Number(result.draggableId);
        const newStageId = Number(result.destination.droppableId);

        if (result.source.droppableId !== result.destination.droppableId) {
            handleStatusChange(candidateId, newStageId);
        }
    };

// Organize data by stage - SAFE PARSING
    const columns = masterData.funnel_stages?.reduce((acc, stage) => {
        acc[stage.id] = {
            name: stage.name,
            items: data.filter(c => {
                // Trim whitespace + safe Number conversion
                const rawStageId = String(c.funnel_stage_id || '').trim();
                const candidateStageId = rawStageId === '' || rawStageId === 'null' ? null : Number(rawStageId);
                return !isNaN(candidateStageId) && candidateStageId === stage.id;
            })
        };
        return acc;
    }, {}) || {};

    return (
        <DragDropContext onDragEnd={handleDragEnd}>
            <div className="flex gap-6 overflow-x-auto pb-4 h-[calc(100vh-280px)] custom-scrollbar">
                {Object.entries(columns).map(([stageId, column]) => (
                    <div key={stageId} className="flex flex-col flex-shrink-0 w-80 bg-gray-50/80 rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-gray-100 bg-white/50 backdrop-blur-sm sticky top-0 z-10 flex justify-between items-center shadow-sm">
                            <h3 className="font-bold text-gray-700 tracking-tight">{t(column.name)}</h3>
                            <span className="bg-teal-100 text-teal-800 text-xs font-bold px-2.5 py-1 rounded-full">{column.items.length}</span>
                        </div>

                        <Droppable droppableId={stageId}>
                            {(provided, snapshot) => (
                                <div
                                    {...provided.droppableProps}
                                    ref={provided.innerRef}
                                    className={`flex-1 p-3 overflow-y-auto custom-scrollbar transition-colors ${snapshot.isDraggingOver ? 'bg-teal-50/50' : ''}`}
                                >
                                    {column.items.map((candidate, index) => (
                                        <Draggable key={candidate.id.toString()} draggableId={candidate.id.toString()} index={index} isDragDisabled={user?.role === 'client'}>
                                            {(provided, snapshot) => (
                                                <div
                                                    ref={provided.innerRef}
                                                    {...provided.draggableProps}
                                                    onClick={() => onCandidateClick && onCandidateClick(candidate)}
                                                    className={`bg-white p-4 rounded-xl mb-3 shadow-sm border ${snapshot.isDragging ? 'border-teal-400 shadow-md scale-[1.02]' : 'border-gray-100 hover:border-gray-300'} transition-all group cursor-pointer`}
                                                >
                                                    <div className="flex justify-between items-start mb-2">
                                                        {user?.role !== 'client' && (
                                                            <div className="flex -ml-2 items-center cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 transition-colors" {...provided.dragHandleProps}>
                                                                <GripVertical size={18} />
                                                            </div>
                                                        )}
                                                        <div className="bg-gray-50 text-[10px] font-bold text-gray-500 uppercase px-2 py-1 rounded border border-gray-100 tracking-wider">
                                                            {candidate.role || 'No Role'}
                                                        </div>
                                                    </div>

                                                    <div className="font-bold text-gray-800 text-sm mb-1">{candidate.name}</div>

                                                    <div className="flex flex-col gap-1.5 mt-3">
                                                        <div className="flex items-center gap-2 text-xs text-gray-500">
                                                            <Briefcase size={12} className="text-gray-400" />
                                                            <span className="truncate">{candidate.client || 'No Client'} {candidate.experience ? `• ${candidate.experience}Y` : ''}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2 text-xs text-gray-500">
                                                            <MapPin size={12} className="text-gray-400" />
                                                            <span className="truncate">{candidate.job_location || 'Remote'}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2 text-xs text-gray-500">
                                                            <DollarSign size={12} className="text-gray-400" />
                                                            <span className="truncate font-semibold text-teal-600">{candidate.expected_ctc ? `Exp CTC: ${candidate.expected_ctc}` : 'Exp CTC: N/A'}</span>
                                                        </div>
                                                    </div>

                                                </div>
                                            )}
                                        </Draggable>
                                    ))}
                                    {provided.placeholder}
                                </div>
                            )}
                        </Droppable>
                    </div>
                ))}
            </div>
        </DragDropContext>
    );
}
