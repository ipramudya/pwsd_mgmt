export type FieldType = 'text' | 'password' | 'todo';

export type CreateTextFieldDataDto = {
  text: string;
};

export type CreatePasswordFieldDataDto = {
  password: string;
};

export type CreateTodoFieldDataDto = {
  isChecked?: boolean;
};

export type CreateFieldRequestDto = {
  name: string;
  type: FieldType;
  data:
    | CreateTextFieldDataDto
    | CreatePasswordFieldDataDto
    | CreateTodoFieldDataDto;
};

export type CreateFieldsRequestDto = {
  fields: CreateFieldRequestDto[];
  blockId?: string; // If provided, attach to existing terminal block
  blockName?: string; // If blockId not provided, create new terminal block with this name
  blockDescription?: string; // Optional description for new block
  parentId?: string; // Parent for new block (if blockId not provided)
};

export type FieldDto = {
  id: number;
  uuid: string;
  name: string;
  type: FieldType;
  createdAt: Date;
  updatedAt: Date;
  createdById: string;
  blockId: string;
};

export type TextFieldDataDto = {
  id: number;
  text: string;
  createdAt: Date;
  updatedAt: Date;
  fieldId: string;
};

export type PasswordFieldDataDto = {
  id: number;
  password: string;
  createdAt: Date;
  updatedAt: Date;
  fieldId: string;
};

export type TodoFieldDataDto = {
  id: number;
  isChecked: boolean;
  createdAt: Date;
  updatedAt: Date;
  fieldId: string;
};

export type FieldWithDataDto = FieldDto & {
  data: TextFieldDataDto | PasswordFieldDataDto | TodoFieldDataDto;
};

export type FieldWithRelatedDataDto = FieldRecord & {
  textField?: TextFieldDataDto | null;
  passwordField?: PasswordFieldDataDto | null;
  todoField?: TodoFieldDataDto | null;
};

export type CreateFieldsResponseDto = {
  fields: FieldWithDataDto[];
  block?: {
    id: number;
    uuid: string;
    name: string;
    description: string | null;
    path: string;
    blockType: 'terminal' | 'container';
    createdAt: Date;
    updatedAt: Date;
    createdById: string;
    parentId: number | null;
  };
};

export type CreateFieldInput = {
  uuid: string;
  name: string;
  type: FieldType;
  createdById: string;
  blockId: string;
};

export type CreateTextFieldInput = {
  text: string;
  fieldId: string;
};

export type CreatePasswordFieldInput = {
  password: string;
  fieldId: string;
};

export type CreateTodoFieldInput = {
  isChecked: boolean;
  fieldId: string;
};

export type FieldRecord = {
  id: number;
  uuid: string;
  name: string;
  type: FieldType;
  createdAt: Date;
  updatedAt: Date;
  createdById: string;
  blockId: string;
};

export type TextFieldRecord = {
  id: number;
  text: string;
  createdAt: Date;
  updatedAt: Date;
  fieldId: string;
};

export type PasswordFieldRecord = {
  id: number;
  password: string;
  createdAt: Date;
  updatedAt: Date;
  fieldId: string;
};

export type TodoFieldRecord = {
  id: number;
  isChecked: boolean;
  createdAt: Date;
  updatedAt: Date;
  fieldId: string;
};

// Update field types
export type UpdateTextFieldDataDto = {
  text: string;
};

export type UpdatePasswordFieldDataDto = {
  password: string;
};

export type UpdateTodoFieldDataDto = {
  isChecked: boolean;
};

export type UpdateFieldRequestDto = {
  fieldId: string;
  name?: string;
  type?: FieldType;
  data:
    | UpdateTextFieldDataDto
    | UpdatePasswordFieldDataDto
    | UpdateTodoFieldDataDto;
};

export type UpdateFieldsRequestDto = {
  fields: UpdateFieldRequestDto[];
};

export type UpdateFieldsResponseDto = {
  updatedFields: FieldWithDataDto[];
};

// Delete field types
export type DeleteFieldsRequestDto = {
  fieldIds: string[];
};

export type DeleteFieldsResponseDto = {
  deletedCount: number;
  deletedFieldIds: string[];
};
