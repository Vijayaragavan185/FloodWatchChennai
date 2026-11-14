package com.floodwatch.alert.model;

import java.util.List;

/** Everything the Insights page shows, each list produced by a different SQL technique. */
public record Insights(List<StreetInsight> chronic,       // INTERSECT
                       List<StreetInsight> newHotspots,   // EXCEPT
                       List<StreetInsight> attention,     // UNION
                       List<WardRank> wardRanking,        // JOIN + GROUP BY + HAVING + sub-query
                       String lastSeason, String thisSeason) { }
