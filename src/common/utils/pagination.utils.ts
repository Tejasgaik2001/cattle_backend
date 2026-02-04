export interface PaginationParams {
    page?: number;
    limit?: number;
}

export interface PaginatedResult<T> {
    data: T[];
    meta: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
        hasNextPage: boolean;
        hasPrevPage: boolean;
    };
}

export function getPagination(params: PaginationParams): { skip: number; take: number } {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));

    return {
        skip: (page - 1) * limit,
        take: limit,
    };
}

export function createPaginatedResult<T>(
    data: T[],
    total: number,
    params: PaginationParams,
): PaginatedResult<T> {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const totalPages = Math.ceil(total / limit);

    return {
        data,
        meta: {
            total,
            page,
            limit,
            totalPages,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
        },
    };
}
