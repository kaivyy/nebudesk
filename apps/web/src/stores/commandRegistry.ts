import React, { useState, useEffect } from 'react';

/**
 * Command Item definition for NebuDesk Central Command Registry.
 * Designed to be type-safe and consumable by:
 * - Desktop Command Palette
 * - Monaco Editor & Global Keybindings
 * - UI Menus and Action Bars
 * - Future P20 AI Agent Tool System
 */
export interface CommandItem {
  id: string;
  title: string;
  category: 'File' | 'Edit' | 'View' | 'Explorer' | 'Terminal' | 'Project' | 'Git' | 'System' | string;
  shortcut?: string;
  icon?: React.ReactNode;
  context?: 'global' | 'code' | 'files' | string;
  action: () => void | Promise<void>;
}

type CommandListener = () => void;

class CommandRegistry {
  private commands = new Map<string, CommandItem>();
  private listeners = new Set<CommandListener>();

  /**
   * Registers a single command. Returns an unregister cleanup function.
   */
  register(cmd: CommandItem): () => void {
    this.commands.set(cmd.id, cmd);
    this.notify();
    return () => this.unregister(cmd.id);
  }

  /**
   * Registers multiple commands at once. Returns an unregister cleanup function.
   */
  registerMany(cmds: CommandItem[]): () => void {
    for (const cmd of cmds) {
      this.commands.set(cmd.id, cmd);
    }
    this.notify();
    return () => {
      for (const cmd of cmds) {
        this.commands.delete(cmd.id);
      }
      this.notify();
    };
  }

  /**
   * Unregisters a command by ID.
   */
  unregister(id: string): void {
    if (this.commands.has(id)) {
      this.commands.delete(id);
      this.notify();
    }
  }

  /**
   * Retrieves all registered commands, optionally filtered by context.
   */
  getCommands(context?: string): CommandItem[] {
    const list = Array.from(this.commands.values());
    if (!context) return list;
    return list.filter(cmd => !cmd.context || cmd.context === 'global' || cmd.context === context);
  }

  /**
   * Executes a command by ID. Returns true if found and executed, false otherwise.
   */
  async execute(id: string): Promise<boolean> {
    const cmd = this.commands.get(id);
    if (!cmd) return false;
    try {
      await cmd.action();
      return true;
    } catch (err) {
      console.error(`[CommandRegistry] Error executing command "${id}":`, err);
      return false;
    }
  }

  /**
   * Subscribes to registry changes.
   */
  subscribe(listener: CommandListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const listener of this.listeners) {
      try {
        listener();
      } catch (err) {
        console.error('[CommandRegistry] Error in change listener:', err);
      }
    }
  }
}

export const commandRegistry = new CommandRegistry();

/**
 * React hook for consuming all commands dynamically.
 */
export function useCommands(context?: string): CommandItem[] {
  const [commands, setCommands] = useState<CommandItem[]>(() => commandRegistry.getCommands(context));

  useEffect(() => {
    setCommands(commandRegistry.getCommands(context));
    const unsubscribe = commandRegistry.subscribe(() => {
      setCommands(commandRegistry.getCommands(context));
    });
    return unsubscribe;
  }, [context]);

  return commands;
}
