WITH Tree AS
(
    SELECT
        Id AS Ancestor,
        Id AS Descendant,
        0  AS Depth
    FROM CallGroup

    UNION ALL

    SELECT
        t.Ancestor AS Ancestor,
        c.Id AS Descendant,
        t.Depth + 1 AS Depth
    FROM CallGroup AS c
    JOIN Tree AS t
        ON c.Parent = t.Descendant
)
INSERT INTO CallGroupTree SELECT * FROM Tree;

CREATE INDEX IF NOT EXISTS CALL_GROUP_TREE_TABLE_DESCENDANT ON CallGroupTree(Descendant);
CREATE INDEX IF NOT EXISTS CALL_GROUP_TREE_TABLE_ANCESTOR ON CallGroupTree(Ancestor);
