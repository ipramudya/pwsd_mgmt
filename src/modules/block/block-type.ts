export enum BlockType {
  CONTAINER = 'container',
  TERMINAL = 'terminal',
}

export function canHaveFields(blockType: string): boolean {
  return blockType === BlockType.TERMINAL;
}

export function canHaveChildren(blockType: string): boolean {
  return blockType === BlockType.CONTAINER;
}

export function validateBlockTypeForFields(blockType: string): void {
  if (!canHaveFields(blockType)) {
    throw new Error('Cannot add fields to container blocks');
  }
}

export function validateBlockTypeForChildren(blockType: string): void {
  if (!canHaveChildren(blockType)) {
    throw new Error('Cannot add child blocks to terminal blocks');
  }
}
