export interface School {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: string | null;
}

export interface CreateSchoolDto {
  name: string;
  code?: string | null;
  description?: string | null;
  displayOrder?: number;
  isActive?: boolean;
}

export interface UpdateSchoolDto {
  name?: string;
  code?: string | null;
  description?: string | null;
  displayOrder?: number;
  isActive?: boolean;
}
