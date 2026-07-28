export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface IRepository<T> {
  find(filter?: object): Promise<T[]>;
  findById(id: string): Promise<T | null>;
  findOne(filter: object): Promise<T | null>;
  create(item: Partial<T>): Promise<T>;
  update(id: string, item: Partial<T>): Promise<T | null>;
  delete(id: string): Promise<boolean>;
  paginate(filter: object, page: number, limit: number): Promise<PaginatedResult<T>>;
}
