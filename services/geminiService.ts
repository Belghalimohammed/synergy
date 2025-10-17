import { GoogleGenAI, FunctionDeclaration, Type, Modality } from "@google/genai";
import { ChatMessage, MindMapData, PrebuiltVoice } from '../types';

if (!process.env.API_KEY) {
    console.error("API_KEY environment variable not set. Please obtain an API key.");
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const createTaskFunctionDeclaration = (statuses: string[]): FunctionDeclaration => ({
  name: 'createTask',
  parameters: {
    type: Type.OBJECT,
    description: 'Creates a single new task with a title and an optional due date and status.',
    properties: {
      title: {
        type: Type.STRING,
        description: 'The title of the task.',
      },
      dueDate: {
        type: Type.STRING,
        description: 'The due date for the task in ISO 8601 format (e.g., "2024-08-15T14:00:00.000Z"). Should be inferred from text like "tomorrow", "next friday", etc.',
      },
      status: {
        type: Type.STRING,
        description: `The status of the task. Available options are: ${statuses.join(', ')}. Default to the first option if not specified.`,
      }
    },
    required: ['title'],
  },
});

const createTaskPlanFunctionDeclaration: FunctionDeclaration = {
    name: 'createTaskPlan',
    parameters: {
      type: Type.OBJECT,
      description: 'Breaks down a high-level goal into a series of smaller, actionable tasks and creates them.',
      properties: {
        tasks: {
          type: Type.ARRAY,
          description: 'An array of task objects to be created.',
          items: {
            type: Type.OBJECT,
            properties: {
              title: {
                type: Type.STRING,
                description: 'The specific, actionable title for the task.',
              },
              description: {
                type: Type.STRING,
                description: 'A detailed description of what needs to be done for this specific task.',
              },
              estimatedDueDate: {
                type: Type.STRING,
                description: 'An estimated due date for this task in ISO 8601 format, inferred from the overall goal and context.',
              },
            },
            required: ['title', 'description', 'estimatedDueDate'],
          }
        },
      },
      required: ['tasks'],
    },
};

const createNoteFunctionDeclaration: FunctionDeclaration = {
    name: 'createNote',
    parameters: {
      type: Type.OBJECT,
      description: 'Creates a new note. There are three ways to specify content: 1) Provide the full markdown content directly. 2) Provide a topic for the AI to generate content about. 3) Provide raw, unstructured text for the AI to format into a well-structured markdown note.',
      properties: {
        title: {
          type: Type.STRING,
          description: 'The title of the note. This is always required.',
        },
        content: {
          type: Type.STRING,
          description: 'The full markdown content of the note. Use this if the user provides the content explicitly.',
        },
        topicForContentGeneration: {
            type: Type.STRING,
            description: 'A topic for the AI to write content about. Use this if the user asks to create a note "about" a topic (e.g., "create a note about photosynthesis").'
        },
        rawTextForFormatting: {
            type: Type.STRING,
            description: 'Raw, unstructured text provided by the user that needs to be formatted into a proper markdown note. Use this when the user provides a block of text and asks to "make a note with this" or "format this as a note".'
        }
      },
      required: ['title'],
    },
};

const genericResponseFunctionDeclaration: FunctionDeclaration = {
    name: 'genericResponse',
    parameters: {
      type: Type.OBJECT,
      description: 'Used for generic conversation or when no specific tool is applicable.',
      properties: {
        text: {
          type: Type.STRING,
          description: 'The text response to the user.',
        },
      },
      required: ['text'],
    },
};

interface AICommand {
    command: 'createTask' | 'createNote' | 'createTaskPlan' | 'genericResponse';
    payload: any;
}

export async function processCommand(prompt: string, statuses: string[]): Promise<AICommand> {
    
    const tools = [{ functionDeclarations: [createTaskFunctionDeclaration(statuses), createNoteFunctionDeclaration, createTaskPlanFunctionDeclaration, genericResponseFunctionDeclaration] }];

    const systemInstruction = `You are a helpful AI assistant integrated into a productivity application named Synergy AI.
    Your primary role is to help users manage their tasks and notes.
    - Today is ${new Date().toISOString()}.
    - If the user asks to "plan", "organize", "outline", or anything that implies creating multiple steps for a project, you MUST use the 'createTaskPlan' function to generate a list of tasks. You MUST provide an estimated due date for every single task within the plan.
    - For simple, single-task creations, you must call the 'createTask' function. Infer the title, due date, and status from the user's prompt.
    - When a user asks to create a note, call the 'createNote' function. There are three possibilities for content: 1) If they provide the full content, use the 'content' parameter. 2) If they ask for a note 'about' a topic, use the 'topicForContentGeneration' parameter. 3) If they provide a block of raw text and ask you to format it, use the 'rawTextForFormatting' parameter. You must choose only one content creation method.
    - For any other queries, greetings, or general conversation, use the 'genericResponse' function to reply.
    - Be concise and helpful. Do not ask for confirmation unless absolutely necessary.`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro', // Using a more capable model for planning
            contents: prompt,
            config: {
                tools,
                systemInstruction,
            },
        });

        if (response.functionCalls && response.functionCalls.length > 0) {
            const functionCall = response.functionCalls[0];
            const commandName = functionCall.name;
            
            if (commandName === 'createTask' || commandName === 'createNote' || commandName === 'createTaskPlan' || commandName === 'genericResponse') {
                 return {
                    command: commandName,
                    payload: functionCall.args,
                };
            }
        }
    
        if (response.text) {
             return {
                command: 'genericResponse',
                payload: { text: response.text },
            };
        }

        return {
            command: 'genericResponse',
            payload: { text: "I'm not sure how to handle that. Could you please rephrase?" },
        };

    } catch (error) {
        console.error("Error processing AI command:", error);
        return {
            command: 'genericResponse',
            payload: { text: "Sorry, I encountered an error. Please try again." },
        };
    }
}

export async function generateNoteContent(topic: string): Promise<string> {
    try {
        const prompt = `Generate a concise, well-structured markdown note about the following topic: "${topic}".
        Use headings, lists, code blocks, and other markdown features where appropriate to create informative and easy-to-read content.`;
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: prompt,
        });

        return response.text;
    } catch (error) {
        console.error("Error generating note content:", error);
        return `Sorry, I was unable to generate content for "${topic}". Please try again.`;
    }
}

export async function formatTextAsNote(rawText: string): Promise<string> {
    try {
        const prompt = `Take the following raw text and format it into a well-structured, clear, and readable markdown note.
        Your goal is to improve the presentation of the information. Use markdown features like headings, subheadings, bold text, italics, lists (bulleted or numbered), and code blocks where appropriate.
        Do not add new information; only structure and format the provided text.
        
        Raw Text:
        ---
        ${rawText}
        ---
        `;
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: prompt,
        });

        return response.text;
    } catch (error) {
        console.error("Error formatting note content:", error);
        return `Sorry, I was unable to format the provided text. Please try again.\n\nOriginal text:\n${rawText}`;
    }
}

export async function generateNoteWithSearch(topic: string): Promise<{ content: string; sources: string }> {
    try {
        const prompt = `Generate a comprehensive and well-structured markdown note about the following topic: "${topic}".
        Use information from the web to provide an up-to-date and informative summary.
        Format the output clearly using headings, lists, and bold text where appropriate.`;
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }],
            },
        });

        let content = response.text;
        let sources = '';
        
        const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;

        if (groundingChunks && groundingChunks.length > 0) {
            const sourceLinks = groundingChunks
                .map((chunk: any) => `- [${chunk.web.title || 'Source'}](${chunk.web.uri})`)
                .join('\n');
            sources = `\n\n---\n\n**Sources:**\n${sourceLinks}`;
        }

        return { content, sources };

    } catch (error) {
        console.error("Error generating note with search:", error);
        return { 
            content: `Sorry, I was unable to generate a note for "${topic}". Please try again.`,
            sources: '' 
        };
    }
}

export async function generateMindMapData(content: string): Promise<MindMapData> {
    const systemInstruction = `You are an expert in summarization and knowledge graph creation. Analyze the provided text and extract the core concepts, key entities, and their relationships.
    Return the data as a single JSON object that strictly follows the provided schema.
    - The main, central topic of the text should be the first node and assigned to group 1.
    - Major sub-topics or direct properties of the main topic should be assigned to group 2.
    - Subsequent, more detailed concepts should be assigned to higher group numbers (3, 4, etc.) based on their depth.
    - Create clear, concise labels for all nodes and links.
    - Do NOT add any explanatory text, markdown formatting, or anything outside of the final JSON object.`;
    
    const prompt = `Analyze the following content and generate a mind map data structure representing its key concepts and their connections. Content:\n\n---START---\n${content}\n---END---`;
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            systemInstruction,
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    nodes: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                id: { type: Type.STRING, description: 'A unique identifier for the node (e.g., "concept_1").' },
                                label: { type: Type.STRING, description: 'A short, descriptive label for the concept.' },
                                group: { type: Type.INTEGER, description: 'A number representing the concept\'s hierarchy level.' }
                            },
                            required: ['id', 'label', 'group']
                        }
                    },
                    links: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                source: { type: Type.STRING, description: 'The id of the source node.' },
                                target: { type: Type.STRING, description: 'The id of the target node.' },
                                label: { type: Type.STRING, description: 'An optional label describing the relationship.' }
                            },
                            required: ['source', 'target']
                        }
                    }
                },
                required: ['nodes', 'links']
            }
        },
    });
    
    try {
        return JSON.parse(response.text);
    } catch (error) {
        console.error("Failed to parse mind map JSON:", error);
        throw new Error("The AI returned an invalid data structure for the mind map.");
    }
}

export async function summarizeContent(content: string): Promise<string> {
    const systemInstruction = `You are an expert summarizer. Analyze the provided content and generate a concise, well-structured summary in Markdown format.
    Use headings, bullet points, and bold text to highlight key information and make the summary easy to read and digest.
    The goal is to capture the main points and essential details of the text.`;

    const prompt = `Please summarize the following content:\n\n---START---\n${content}\n---END---`;
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { systemInstruction },
        });

        return response.text;
    } catch (error) {
        console.error("Error summarizing content:", error);
        return "Sorry, an error occurred while generating the summary. Please try again.";
    }
}

export async function generateSpeech(text: string, voiceName: PrebuiltVoice): Promise<string> {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: voiceName },
                    },
                },
            },
        });
        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!base64Audio) {
            throw new Error("No audio data received from API.");
        }
        return base64Audio;
    } catch (error) {
        console.error("Error generating speech:", error);
        throw new Error("Failed to generate speech.");
    }
}

export async function getQuoteOfTheDay(): Promise<{ quote: string; author: string }> {
    const prompt = "Give me one inspiring or thought-provoking quote and its author.";
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        quote: { type: Type.STRING, description: "The text of the quote." },
                        author: { type: Type.STRING, description: "The author of the quote." }
                    },
                    required: ["quote", "author"]
                }
            }
        });
        return JSON.parse(response.text);
    } catch (error) {
        console.error("Error getting quote:", error);
        return { quote: "The journey of a thousand miles begins with a single step.", author: "Lao Tzu" }; // Fallback
    }
}


// --- AI Chat Service ---

const fileToGenerativePart = (file: File) => {
  return new Promise<{ inlineData: { mimeType: string; data: string } }>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64Data = (reader.result as string).split(',')[1];
      resolve({
        inlineData: {
          mimeType: file.type,
          data: base64Data,
        },
      });
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
};

const generateImageFunctionDeclaration: FunctionDeclaration = {
  name: 'generateImage',
  parameters: {
    type: Type.OBJECT,
    description: 'Generates an image based on a descriptive prompt.',
    properties: {
      prompt: {
        type: Type.STRING,
        description: 'A detailed, descriptive prompt for the image to be generated. Should describe subjects, scenery, style, colors, etc.',
      },
    },
    required: ['prompt'],
  },
};

export async function continueChat(
    history: ChatMessage[],
    newPrompt: { text: string; image: File | null }
): Promise<ChatMessage> {

    const tools = [{ functionDeclarations: [generateImageFunctionDeclaration] }];
    const systemInstruction = `You are a helpful and creative AI chat assistant named Synergy. You can hold a conversation, analyze images, and you can also generate images if the user asks for one. If the user asks you to "create", "generate", "draw", or "make" an image, you MUST call the 'generateImage' function with a suitable, descriptive prompt. For all other conversation, do not call any functions and just respond naturally in markdown.`;

    const userParts = [];
    if (newPrompt.text) {
        userParts.push({ text: newPrompt.text });
    }
    if (newPrompt.image) {
        const imagePart = await fileToGenerativePart(newPrompt.image);
        userParts.push(imagePart);
    }

    const contents = [
        ...history,
        { role: 'user', parts: userParts }
    ];

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents,
            config: {
                tools,
                systemInstruction
            }
        });

        if (response.functionCalls && response.functionCalls[0]?.name === 'generateImage') {
            const imagePrompt = response.functionCalls[0].args.prompt as string;
            
            const imageResponse = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: { parts: [{ text: imagePrompt }] },
                config: {
                    responseModalities: [Modality.IMAGE],
                },
            });
            
            return imageResponse.candidates![0].content as ChatMessage;
        }
        
        return response.candidates![0].content as ChatMessage;

    } catch (error) {
        console.error("Error continuing chat:", error);
        return {
            role: 'model',
            parts: [{ text: "Sorry, I encountered an error. Please try your request again." }]
        };
    }
}
