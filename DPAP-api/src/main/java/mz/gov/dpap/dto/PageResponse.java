package mz.gov.dpap.dto;

import java.util.List;

/** Paginated envelope: `{ items, page, pageSize, total }` (page is 1-based). */
public record PageResponse<T>(List<T> items, int page, int pageSize, long total) {}
