-- Add CALLER propertie to CALL_TABLE
ALTER TABLE CALL_TABLE RENAME TO TMP;
CREATE TABLE "CALL_TABLE"(ID CHAR(50) PRIMARY KEY NOT NULL,PROCESS_ID INT NOT NULL,THREAD_ID INT NOT NULL,FUNCTION_ID INT NOT NULL,INSTRUCTION_ID INT NOT NULL,START_TIME CHAR(12),END_TIME CHAR(12),CALLER CHAR(50));
INSERT INTO CALL_TABLE SELECT ID, PROCESS_ID, THREAD_ID, FUNCTION_ID, INSTRUCTION_ID, START_TIME, END_TIME, (SELECT CALL_ID FROM SEGMENT_TABLE WHERE ID=(SELECT SEGMENT_ID FROM INSTRUCTION_TABLE WHERE ID=INSTRUCTION_ID)) AS CALLER FROM TMP;
DROP TABLE TMP;

-- intermediary index for performance reasons
CREATE INDEX IF NOT EXISTS CALL_TABLE_ID ON CALL_TABLE(ID);
CREATE INDEX IF NOT EXISTS CALL_TABLE_CALLER ON CALL_TABLE(CALLER);

-- Add CALLS_OTHER propertie to CALL_TABLE
ALTER TABLE CALL_TABLE RENAME TO TMP;
CREATE TABLE "CALL_TABLE"(ID CHAR(50) PRIMARY KEY NOT NULL,PROCESS_ID INT NOT NULL,THREAD_ID INT NOT NULL,FUNCTION_ID INT NOT NULL,INSTRUCTION_ID INT NOT NULL,START_TIME CHAR(12),END_TIME CHAR(12),CALLER CHAR(50), CALLS_OTHER INTEGER);
INSERT INTO CALL_TABLE SELECT ID, PROCESS_ID, THREAD_ID, FUNCTION_ID, INSTRUCTION_ID, START_TIME, END_TIME, CALLER, (SELECT COUNT(t.ID) FROM TMP t WHERE t.CALLER = c.ID ) AS CALLS_OTHER FROM TMP c;
DROP TABLE TMP;

CREATE INDEX IF NOT EXISTS ACCESS_TABLE_ID ON ACCESS_TABLE(ID);
CREATE INDEX IF NOT EXISTS CALL_TABLE_ID ON CALL_TABLE(ID);
CREATE INDEX IF NOT EXISTS FILE_TABLE_ID ON FILE_TABLE(ID);
CREATE INDEX IF NOT EXISTS FUNCTION_TABLE_ID ON FUNCTION_TABLE(ID);
CREATE INDEX IF NOT EXISTS INSTRUCTION_TABLE_ID ON INSTRUCTION_TABLE(ID);
CREATE INDEX IF NOT EXISTS REFERENCE_TABLE_ID ON REFERENCE_TABLE(REFERENCE_ID);
CREATE INDEX IF NOT EXISTS SEGMENT_TABLE_ID ON SEGMENT_TABLE(ID);
CREATE INDEX IF NOT EXISTS THREAD_TABLE_ID ON THREAD_TABLE(ID);

CREATE INDEX IF NOT EXISTS ACCESS_TABLE_INSTRUCTION ON ACCESS_TABLE(INSTRUCTION_ID);
CREATE INDEX IF NOT EXISTS ACCESS_TABLE_REFERENCE ON ACCESS_TABLE(REFERENCE_ID);

CREATE INDEX IF NOT EXISTS CALL_TABLE_CALLER ON CALL_TABLE(CALLER);
CREATE INDEX IF NOT EXISTS CALL_TABLE_FUNCTION ON CALL_TABLE(FUNCTION_ID);

CREATE INDEX IF NOT EXISTS FUNCTION_TABLE_FILE ON FUNCTION_TABLE(FILE_ID);

CREATE INDEX IF NOT EXISTS INSTRUCTION_TABLE_SEGMENT ON INSTRUCTION_TABLE(SEGMENT_ID);

CREATE INDEX IF NOT EXISTS REFERENCE_TABLE_ALLOCATOR ON REFERENCE_TABLE(ALLOCATOR);

CREATE INDEX IF NOT EXISTS SEGMENT_TABLE_CALL ON SEGMENT_TABLE(CALL_ID);

CREATE INDEX IF NOT EXISTS THREAD_TABLE_INSTRUCTION ON THREAD_TABLE(INSTRUCTION_ID);
CREATE INDEX IF NOT EXISTS THREAD_TABLE_PARENT ON THREAD_TABLE(PARENT_THREAD_ID);
CREATE INDEX IF NOT EXISTS THREAD_TABLE_CHILD ON THREAD_TABLE(CHILD_THREAD_ID);

VACUUM;
