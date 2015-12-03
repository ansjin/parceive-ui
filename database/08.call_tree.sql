DROP TABLE IF EXISTS CallTree;
CREATE TABLE "CallTree"
(
    Ancestor INT NOT NULL,
    Descendant INT NOT NULL,
    Depth INT NOT NULL,
    FOREIGN KEY(Ancestor) REFERENCES Call(Id),
    FOREIGN KEY(Descendant) REFERENCES Call(Id)
);

WITH Tree AS
(
    SELECT
        Id AS Ancestor,
        Id AS Descendant,
        0  AS Depth
    FROM Call

    UNION ALL

    SELECT
        t.Ancestor AS Ancestor,
        c.Id AS Descendant,
        t.Depth + 1 AS Depth
    FROM Call AS c
    JOIN Tree AS t
        ON c.Caller = t.Descendant
)
INSERT INTO CallTree SELECT * FROM Tree WHERE Depth > 0;

CREATE INDEX IF NOT EXISTS CALL_TREE_TABLE_DESCENDANT ON CallTree(Descendant);
CREATE INDEX IF NOT EXISTS CALL_TREE_TABLE_ANCESTOR ON CallTree(Ancestor);
