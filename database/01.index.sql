CREATE INDEX IF NOT EXISTS ACCESS_TABLE_ID ON Access(Id);
CREATE INDEX IF NOT EXISTS FILE_TABLE_ID ON File(Id);
CREATE INDEX IF NOT EXISTS FUNCTION_TABLE_ID ON Function(Id);
CREATE INDEX IF NOT EXISTS INSTRUCTION_TABLE_ID ON Instruction(Id);
CREATE INDEX IF NOT EXISTS REFERENCE_TABLE_ID ON Reference(Reference);
CREATE INDEX IF NOT EXISTS SEGMENT_TABLE_ID ON Segment(Id);
CREATE INDEX IF NOT EXISTS THREAD_TABLE_ID ON Thread(Id);

CREATE INDEX IF NOT EXISTS ACCESS_TABLE_INSTRUCTION ON Access(Instruction);
CREATE INDEX IF NOT EXISTS ACCESS_TABLE_REFERENCE ON Access(Reference);

CREATE INDEX IF NOT EXISTS FUNCTION_TABLE_FILE ON Function(File);

CREATE INDEX IF NOT EXISTS INSTRUCTION_TABLE_SEGMENT ON Instruction(Segment);

CREATE INDEX IF NOT EXISTS REFERENCE_TABLE_ALLOCATOR ON Reference(Allocator);

CREATE INDEX IF NOT EXISTS SEGMENT_TABLE_CALL ON Segment(Call);
CREATE INDEX IF NOT EXISTS SEGMENT_TABLE_LOOP ON Segment(Loop);

CREATE INDEX IF NOT EXISTS THREAD_TABLE_INSTRUCTION ON Thread(Instruction);