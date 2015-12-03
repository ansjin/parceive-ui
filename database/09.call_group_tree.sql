DROP TABLE IF EXISTS CallGroupTree;
CREATE TABLE "CallGroupTree"
(
    Ancestor INT NOT NULL,
    Descendant INT NOT NULL,
    Depth INT NOT NULL,
    FOREIGN KEY(Ancestor) REFERENCES CallGroup(Id),
    FOREIGN KEY(Descendant) REFERENCES CallGroup(Id)
);

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
INSERT INTO CallGroupTree SELECT * FROM Tree WHERE Depth > 0;

CREATE INDEX IF NOT EXISTS CALL_GROUP_TREE_TABLE_DESCENDANT ON CallGroupTree(Descendant);
CREATE INDEX IF NOT EXISTS CALL_GROUP_TREE_TABLE_ANCESTOR ON CallGroupTree(Ancestor);
