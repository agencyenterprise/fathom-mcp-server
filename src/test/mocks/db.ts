import { vi } from "vitest";

export function mockDbInsert(returnValue?: unknown) {
  return {
    values: vi.fn().mockReturnValue({
      onConflictDoUpdate: vi.fn().mockResolvedValue(returnValue),
    }),
  };
}

export function mockDbSelect(rows: unknown[]) {
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue(rows),
      }),
    }),
  };
}

export function mockDbDelete(rowCount = 1) {
  return {
    where: vi.fn().mockResolvedValue({ rowCount }),
  };
}

export function mockDbUpdate(rowCount = 1) {
  return {
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue({ rowCount }),
    }),
  };
}

export function mockDbTransaction<T>(result: T) {
  return vi.fn().mockImplementation(async (callback) => {
    const mockTx = {
      select: () => mockDbSelect([result]),
      update: () => mockDbUpdate(),
    };
    return callback(mockTx);
  });
}
