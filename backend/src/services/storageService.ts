import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

export interface MemoryUser {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: string;
  createdAt: Date;
}

export interface MemoryProject {
  id: string;
  ownerId: string;
  name: string;
  description: string;
  thumbnailUrl: string;
  status: string;
  geometry: Record<string, any>;
  originalFile?: any;
  exportHistory: any[];
  createdAt: Date;
  updatedAt: Date;
}

// In-memory collections
const memoryUsers = new Map<string, MemoryUser>();
const memoryProjects = new Map<string, MemoryProject>();

export const memoryStore = {
  // Check if mongo is active
  isMongoConnected(): boolean {
    return mongoose.connection.readyState === 1;
  },

  async createUser(name: string, email: string, passwordPlain: string): Promise<MemoryUser> {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(passwordPlain, salt);
    const id = `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const user: MemoryUser = {
      id,
      name,
      email: email.toLowerCase(),
      passwordHash: hash,
      role: 'architect',
      createdAt: new Date(),
    };
    memoryUsers.set(email.toLowerCase(), user);
    return user;
  },

  findUserByEmail(email: string): MemoryUser | undefined {
    return memoryUsers.get(email.toLowerCase());
  },

  findUserById(id: string): MemoryUser | undefined {
    for (const u of memoryUsers.values()) {
      if (u.id === id) return u;
    }
    return undefined;
  },

  createProject(ownerId: string, name: string, description: string = '', geometry: any = {}): MemoryProject {
    const id = `proj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const proj: MemoryProject = {
      id,
      ownerId,
      name,
      description,
      thumbnailUrl: '',
      status: 'draft',
      geometry,
      exportHistory: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    memoryProjects.set(id, proj);
    return proj;
  },

  listProjectsByOwner(ownerId: string): MemoryProject[] {
    const list: MemoryProject[] = [];
    for (const p of memoryProjects.values()) {
      if (p.ownerId === ownerId) {
        list.push(p);
      }
    }
    return list.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  },

  getProjectById(id: string): MemoryProject | undefined {
    return memoryProjects.get(id);
  },

  updateProject(id: string, updates: Partial<MemoryProject>): MemoryProject | undefined {
    const proj = memoryProjects.get(id);
    if (!proj) return undefined;
    Object.assign(proj, updates, { updatedAt: new Date() });
    return proj;
  },

  deleteProject(id: string): boolean {
    return memoryProjects.delete(id);
  },
};
