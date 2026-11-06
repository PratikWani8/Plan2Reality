import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Send,
  X,
  Bot,
  Check,
  Loader2,
  RotateCcw,
  Mic,
  MicOff,
} from 'lucide-react';
import { FloorPlanGeometry, FurnitureItem } from '../../types/geometry';
import { ViewerSettings, CameraViewPreset, SelectedEntity } from '../viewer3d/types';
import {
  processAssistantCommand,
  AssistantAction,
  checkServerAiStatus,
} from '../../services/aiAssistantService';
import {
  loadChatState,
  saveChatState,
  ChatMessage,
} from '../../utils/workspaceStorage';

interface NaturalLanguageAssistantProps {
  geometry: FloorPlanGeometry;
  onUpdateGeometry: (updater: (prev: FloorPlanGeometry) => FloorPlanGeometry) => void;
  settings: ViewerSettings;
  onUpdateSettings: (updater: (prev: ViewerSettings) => ViewerSettings) => void;
  selectedEntity: SelectedEntity;
  onResetCamera?: () => void;
  onExportGLB?: () => void;
  onExportJSON?: () => void;
  className?: string;
}

export const NaturalLanguageAssistant: React.FC<NaturalLanguageAssistantProps> = ({
  geometry,
  onUpdateGeometry,
  settings,
  onUpdateSettings,
  selectedEntity,
  onResetCamera,
  onExportGLB,
  onExportJSON,
  className = '',
}) => {
  const [initialChat] = useState(() => loadChatState());
  const [isOpen, setIsOpen] = useState(initialChat.isOpen);
  const [prompt, setPrompt] = useState(initialChat.prompt);
  const [messages, setMessages] = useState<ChatMessage[]>(initialChat.messages);
  const [isThinking, setIsThinking] = useState(false);
  const [serverAiActive, setServerAiActive] = useState(false);
  const [serverProvider, setServerProvider] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [speechLanguage, setSpeechLanguage] = useState<'en-US' | 'hi-IN' | 'mr-IN'>('en-US');

  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    checkServerAiStatus()
      .then((status) => {
        setServerAiActive(status.hasServerKey);
        setServerProvider(status.defaultProvider);
      })
      .catch((error) => {
        console.error('Unable to check AI server status:', error);
        setServerAiActive(false);
      });
  }, []);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  const toggleVoiceRecognition = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognitionAPI =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'assistant',
          text: 'Speech recognition is not supported in this browser. Please use a supported version of Chrome over HTTPS or localhost.',
          time: new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          }),
        },
      ]);
      return;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.lang = speechLanguage;
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onresult = (event: any) => {
      let transcript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          transcript += event.results[i][0].transcript;
        }
      }

      if (transcript.trim()) {
        setPrompt((prev) =>
          prev.trim()
            ? `${prev.trim()} ${transcript.trim()}`
            : transcript.trim()
        );
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
    };

    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;

    try {
      recognition.start();
      setIsListening(true);
    } catch (error) {
      console.error('Unable to start speech recognition:', error);
      setIsListening(false);
    }
  };

  // Persist messages, open state and unfinished prompt across refreshes.
  useEffect(() => {
    saveChatState({
      messages,
      isOpen,
      prompt,
    });
  }, [messages, isOpen, prompt]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isThinking]);

  const quickPrompts = [
    'Make walls grey',
    'Set wall height to 3.2m',
    'Switch to dollhouse view',
    'Change floor to marble',
    'Add a contemporary sofa',
    'What is the total square footage?',
    'Make walls white and switch to top-down view',
  ];

  const handleClearChat = () => {
    const resetMsg: ChatMessage = {
      sender: 'assistant',
      text: 'Conversation reset. How can I assist with your 3D building plan?',
      time: 'Just now',
    };

    setMessages([resetMsg]);
    setPrompt('');
    saveChatState({
      messages: [resetMsg],
      isOpen,
      prompt: '',
    });
  };

  const executeActionOnScene = (action: AssistantAction) => {
    switch (action.type) {
      case 'SET_WALL_MATERIAL': {
        const material = action.payload.material || 'grey';

        onUpdateGeometry((prev) => ({
          ...prev,
          walls: prev.walls.map((wall) => ({ ...wall, material })),
        }));
        break;
      }

      case 'SET_WALL_HEIGHT': {
        const height = parseFloat(action.payload.height) || 2.8;

        onUpdateGeometry((prev) => ({
          ...prev,
          metadata: {
            ...prev.metadata,
            defaultWallHeight: height,
          },
          walls: prev.walls.map((wall) => ({ ...wall, height })),
        }));
        break;
      }

      case 'SET_WALL_THICKNESS': {
        const thickness = parseFloat(action.payload.thickness) || 0.2;

        onUpdateGeometry((prev) => ({
          ...prev,
          metadata: {
            ...prev.metadata,
            defaultWallThickness: thickness,
          },
          walls: prev.walls.map((wall) => ({ ...wall, thickness })),
        }));
        break;
      }

      case 'SET_FLOOR_MATERIAL': {
        const material = action.payload.material || 'hardwood_oak';
        const targetId =
          action.payload.roomId ||
          (selectedEntity.type === 'room' ? selectedEntity.id : null);

        onUpdateGeometry((prev) => ({
          ...prev,
          rooms: prev.rooms.map((room) =>
            targetId
              ? room.id === targetId
                ? { ...room, floorMaterial: material }
                : room
              : { ...room, floorMaterial: material }
          ),
        }));
        break;
      }

      case 'RENAME_ROOM': {
        const newName = action.payload.newName;
        const targetId =
          action.payload.roomId ||
          (selectedEntity.type === 'room' ? selectedEntity.id : null);

        if (newName) {
          onUpdateGeometry((prev) => ({
            ...prev,
            rooms: prev.rooms.map((room) =>
              targetId
                ? room.id === targetId
                  ? { ...room, name: newName }
                  : room
                : prev.rooms.length > 0 && room.id === prev.rooms[0].id
                  ? { ...room, name: newName }
                  : room
            ),
          }));
        }
        break;
      }

      case 'ADD_FURNITURE': {
        const type = action.payload.type || 'sofa';
        const name =
          action.payload.name ||
          `${type.charAt(0).toUpperCase()}${type.slice(1)}`;

        let posX = (Math.random() - 0.5) * 2;
        let posZ = (Math.random() - 0.5) * 2;

        if (
          Array.isArray(action.payload.position) &&
          action.payload.position.length >= 3
        ) {
          posX = Number(action.payload.position[0]);
          posZ = Number(action.payload.position[2]);
        } else if (action.payload.roomId) {
          const targetRoom = geometry.rooms.find(
            (room) => room.id === action.payload.roomId
          );

          if (targetRoom?.polygon?.length) {
            posX =
              targetRoom.polygon.reduce((sum, point) => sum + point.x, 0) /
              targetRoom.polygon.length;

            posZ =
              targetRoom.polygon.reduce(
                (sum, point) => sum + (point.z ?? (point as any).y ?? 0),
                0
              ) / targetRoom.polygon.length;
          }
        }

        const newFurniture: FurnitureItem = {
          id: `furn_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          type,
          name,
          position: { x: posX, y: 0, z: posZ },
          rotation: {
            x: 0,
            y: (Math.random() - 0.5) * Math.PI,
            z: 0,
          },
          dimensions:
            type === 'sofa'
              ? { width: 2.2, height: 0.8, depth: 0.9 }
              : type === 'bed'
                ? { width: 2.0, height: 0.9, depth: 2.1 }
                : type === 'dining_table'
                  ? { width: 1.8, height: 0.76, depth: 0.9 }
                  : type === 'desk'
                    ? { width: 1.4, height: 0.75, depth: 0.7 }
                    : { width: 0.5, height: 1.1, depth: 0.5 },
        };

        onUpdateGeometry((prev) => ({
          ...prev,
          furniture: [...(prev.furniture || []), newFurniture],
        }));
        break;
      }

      case 'DELETE_FURNITURE': {
        // If no furniture ID is provided, do not accidentally delete everything.
        if (!action.payload.id) {
          console.warn('DELETE_FURNITURE ignored: furniture ID is required.');
          break;
        }

        onUpdateGeometry((prev) => ({
          ...prev,
          furniture: prev.furniture.filter(
            (furniture) => furniture.id !== action.payload.id
          ),
        }));
        break;
      }

      case 'SET_CAMERA_VIEW': {
        const preset = action.payload.preset as CameraViewPreset;

        if (preset) {
          onUpdateSettings((prev) => ({
            ...prev,
            cameraPreset: preset,
          }));
        }
        break;
      }

      case 'RESET_CAMERA': {
        onResetCamera?.();
        break;
      }

      case 'TOGGLE_VISIBILITY': {
        const { element, visible } = action.payload;

        if (element === 'grid') {
          onUpdateSettings((prev) => ({ ...prev, showGrid: visible }));
        }
        if (element === 'walls') {
          onUpdateSettings((prev) => ({ ...prev, showWalls: visible }));
        }
        if (element === 'floors') {
          onUpdateSettings((prev) => ({ ...prev, showFloors: visible }));
        }
        if (element === 'furniture') {
          onUpdateSettings((prev) => ({ ...prev, showFurniture: visible }));
        }
        break;
      }

      case 'TOGGLE_WIREFRAME': {
        onUpdateSettings((prev) => ({
          ...prev,
          wireframe: action.payload.enabled,
        }));
        break;
      }

      case 'EXPORT_MODEL': {
        if (action.payload.format === 'json') {
          onExportJSON?.();
        } else {
          onExportGLB?.();
        }
        break;
      }

      default: {
        console.warn('Unsupported assistant action:', action);
      }
    }
  };

  const handleSendMessage = async (textToSend: string) => {
    const text = textToSend.trim();

    if (!text || isThinking) return;

    const userMessage: ChatMessage = {
      sender: 'user',
      text,
      time: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setPrompt('');
    setIsThinking(true);

    const historyPayload = messages.slice(-6).map((message) => ({
      role: message.sender === 'user' ? ('user' as const) : ('assistant' as const),
      content: message.text,
    }));

    try {
      const response = await processAssistantCommand(
        text,
        geometry,
        settings,
        selectedEntity,
        historyPayload
      );

      if (response.actions?.length) {
        response.actions.forEach((action) => executeActionOnScene(action));
      }

      const assistantMessage: ChatMessage = {
        sender: 'assistant',
        text: response.reply,
        time: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
        actionsExecuted: response.actions,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error: any) {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'assistant',
          text: `AI error: ${error.message || 'Unable to execute command'}`,
          time: new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          }),
        },
      ]);
    } finally {
      setIsThinking(false);
    }
  };

  return (
    <div className={`relative flex flex-col items-end gap-4 ${className}`}>
      {isOpen && (
        <div className="w-88 sm:w-96 max-w-[calc(100vw-2.5rem)] bg-[#141614] border border-[#2B2C2B] rounded-2xl shadow-2xl overflow-hidden flex flex-col text-[#FAF8F5] animate-slide-up font-sans pointer-events-auto">
          {/* Header */}
          <div className="p-3.5 border-b border-[#2B2C2B] bg-[#1A1C1A] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#1E372D] flex items-center justify-center text-[#9DBEB0] border border-[#34604F]">
                <Bot className="w-4 h-4" />
              </div>

              <div>
                <span className="font-semibold text-xs text-white">
                  Plan2Reality AI
                </span>
                <span className="text-[10px] text-[#6E9C88] block">
                  Architectural LLM Assistant
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleClearChat}
                className="p-1.5 rounded-md text-[#888888] hover:text-white transition"
                title="Reset Conversation"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-md text-[#888888] hover:text-white transition"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Chat Messages */}
          <div className="p-3.5 space-y-3 h-72 overflow-y-auto text-xs bg-[#0E100E]">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex flex-col ${
                  message.sender === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                <div
                  className={`max-w-[88%] p-2.5 rounded-xl text-xs leading-relaxed ${
                    message.sender === 'user'
                      ? 'bg-[#1E372D] text-white border border-[#34604F]/60'
                      : 'bg-[#141614] text-[#FAF8F5] border border-[#2B2C2B]'
                  }`}
                >
                  {message.text}

                  {message.actionsExecuted?.length ? (
                    <div className="mt-2 pt-2 border-t border-[#2B2C2B] space-y-1">
                      {message.actionsExecuted.map((action, actionIndex) => (
                        <div
                          key={actionIndex}
                          className="inline-flex items-center gap-1.5 text-[10px] font-mono text-[#9DBEB0] bg-[#0E100E] px-2 py-0.5 rounded border border-[#34604F]/40 mr-1.5 mb-1"
                        >
                          <Check className="w-3 h-3 text-[#6E9C88]" />
                          <span>{action.description}</span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="flex items-center gap-1 mt-0.5 px-1">
                  <span className="text-[9px] text-[#6E9C88]">
                    {message.time}
                  </span>
                </div>
              </div>
            ))}

            {isThinking && (
              <div className="flex items-center gap-2 text-xs text-[#9DBEB0] bg-[#141614] p-2.5 rounded-xl border border-[#2B2C2B] w-fit animate-pulse">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#6E9C88]" />
                <span>AI reasoning and generating 3D operations...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts */}
          <div className="p-2 border-t border-[#2B2C2B] bg-[#141614] flex flex-wrap gap-1 max-h-16 overflow-y-auto">
            {quickPrompts.map((quickPrompt) => (
              <button
                key={quickPrompt}
                onClick={() => handleSendMessage(quickPrompt)}
                disabled={isThinking}
                className="text-[10px] px-2 py-0.5 rounded-md bg-[#1A1C1A] hover:bg-[#1E372D] text-[#9DBEB0] hover:text-white border border-[#2B2C2B] transition whitespace-nowrap disabled:opacity-50"
              >
                {quickPrompt}
              </button>
            ))}
          </div>

          {/* Input */}
          <form
            onSubmit={(event) => {
              event.preventDefault();
              handleSendMessage(prompt);
            }}
            className="p-2.5 border-t border-[#2B2C2B] bg-[#1A1C1A] flex items-center gap-1.5"
          >
            <input
              type="text"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              disabled={isThinking}
              placeholder="Ask an architectural question or command..."
              className="flex-1 min-w-0 px-3 py-1.5 rounded-lg bg-[#0E100E] border border-[#2B2C2B] text-xs text-white placeholder-[#555146] focus:outline-none focus:border-[#467A65]"
            />

            <select
              value={speechLanguage}
              onChange={(event) =>
                setSpeechLanguage(
                  event.target.value as 'en-US' | 'hi-IN' | 'mr-IN'
                )
              }
              disabled={isThinking || isListening}
              aria-label="Voice recognition language"
              title="Voice recognition language"
              className="w-[52px] px-1.5 py-2 rounded-lg bg-[#0E100E] border border-[#2B2C2B] text-[10px] text-[#9DBEB0] outline-none"
            >
              <option value="en-US">EN</option>
              <option value="hi-IN">HI</option>
              <option value="mr-IN">MR</option>
            </select>

            <button
              type="button"
              onClick={toggleVoiceRecognition}
              disabled={isThinking}
              title={isListening ? 'Stop recording' : 'Start voice command'}
              aria-label={isListening ? 'Stop recording' : 'Start voice command'}
              className={`p-2 rounded-lg border transition flex items-center justify-center ${
                isListening
                  ? 'bg-red-500/20 border-red-500/50 text-red-400 animate-pulse'
                  : 'bg-[#0E100E] border-[#2B2C2B] text-[#9DBEB0] hover:bg-[#1E372D] hover:text-white'
              } disabled:opacity-40`}
            >
              {isListening ? (
                <MicOff className="w-3.5 h-3.5" />
              ) : (
                <Mic className="w-3.5 h-3.5" />
              )}
            </button>

            <button
              type="submit"
              disabled={!prompt.trim() || isThinking}
              className="p-2 rounded-lg bg-[#1E372D] hover:bg-[#2A4D3F] text-white disabled:opacity-40 transition flex items-center justify-center"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}

      {/* AI Toggle Button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="px-3.5 py-2 rounded-full bg-[#141614]/95 hover:bg-[#1E372D] text-white border border-[#34604F]/80 shadow-elevated flex items-center gap-2 text-xs font-semibold transition-all hover:scale-105 pointer-events-auto backdrop-blur-md"
      >
        <Sparkles className="w-3.5 h-3.5 text-[#9DBEB0] animate-pulse" />

        <span>
          {isOpen ? 'Close AI Assistant' : 'AI Architectural Assistant'}
        </span>

        <span
          className={`w-2 h-2 rounded-full ${
            serverAiActive ? 'bg-[#6E9C88]' : 'bg-stone-500'
          }`}
          title={
            serverAiActive
              ? `AI service connected${serverProvider ? `: ${serverProvider}` : ''}`
              : 'AI service unavailable'
          }
        />
      </button>
    </div>
  );
};