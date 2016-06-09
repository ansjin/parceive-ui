PRAGMA foreign_keys = OFF;

ALTER TABLE LoopExecution RENAME TO LoopExecutionOld;
CREATE TABLE LoopExecution(
  Id INTEGER PRIMARY KEY NOT NULL,
  Loop INTEGER NOT NULL,
  ParentIteration INTEGER,
  Start INTEGER,
  End INTEGER,
  StartTime VARCHAR,
  EndTime VARCHAR,
  Duration INTEGER,
  DurationMs INTEGER,
  Call INTEGER,
  IterationsCount INTEGER,
  FOREIGN KEY(Loop) REFERENCES Loop(Id),
  FOREIGN KEY(ParentIteration) REFERENCES LoopIteration(Id),
  FOREIGN KEY(Call) REFERENCES Call(Id)
);

ALTER TABLE Call RENAME TO CallOld;
CREATE TABLE Call(
    Id INTEGER PRIMARY KEY NOT NULL,
    Thread INTEGER,
    Function INTEGER,
    Instruction INTEGER,
    Start INTEGER,
    End INTEGER,
    StartTime VARCHAR,
    EndTime VARCHAR,
    Duration INTEGER,
    DurationMs INTEGER,
    Caller INTEGER,
    CallerIteration INTEGER,
    CallerExecution INTEGER,
    CallGroup INTEGER,
    CallsOther INTEGER,
    LoopCount INTEGER,
    FOREIGN KEY(Function) REFERENCES Function(Id),
    FOREIGN KEY(Thread) REFERENCES Thread(Id),
    FOREIGN KEY(Instruction) REFERENCES Instruction(Id),
    FOREIGN KEY(Caller) REFERENCES Call(Id),
    FOREIGN KEY(CallerIteration) REFERENCES LoopIteration(Id),
    FOREIGN KEY(CallerExecution) REFERENCES LoopExecution(Id),
    FOREIGN KEY(CallGroup) REFERENCES CallGroup(Id)
);

CREATE TABLE CallGroup(
  Id INTEGER PRIMARY KEY NOT NULL,
  Function INTEGER NOT NULL,
  Caller INTEGER,
  Count INTEGER,
  Parent INTEGER,
  Start INTEGER,
  End INTEGER,
  StartTime VARCHAR,
  EndTime VARCHAR,
  Duration INTEGER,
  DurationMs INTEGER,
  CallerExecution INTEGER,
  Thread INTEGER,
  FOREIGN KEY(Function) REFERENCES Function(Id),
  FOREIGN KEY(Caller) REFERENCES Caller(Id),
  FOREIGN KEY(Parent) REFERENCES CallGroup(Id),
  FOREIGN KEY(CallerExecution) REFERENCES LoopExecution(Id),
  FOREIGN KEY(Thread) REFERENCES Thread(Id)
);

CREATE TABLE CallTree
(
    Ancestor INTEGER NOT NULL,
    Descendant INTEGER NOT NULL,
    Depth INTEGER NOT NULL,
    FOREIGN KEY(Ancestor) REFERENCES Call(Id),
    FOREIGN KEY(Descendant) REFERENCES Call(Id)
);

CREATE TABLE CallGroupTree
(
    Ancestor INTEGER NOT NULL,
    Descendant INTEGER NOT NULL,
    Depth INTEGER NOT NULL,
    FOREIGN KEY(Ancestor) REFERENCES CallGroup(Id),
    FOREIGN KEY(Descendant) REFERENCES CallGroup(Id)
);

CREATE TABLE CallReference
(
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    Call INTEGER NOT NULL,
    Reference INTEGER NOT NULL,
    Read INTEGER NOT NULL,
    Write INTEGER NOT NULL,
    FOREIGN KEY(Call) REFERENCES Call(Id),
    FOREIGN KEY(Reference) REFERENCES Reference(Id)
);

CREATE TABLE CallGroupReference
(
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    CallGroup INTEGER NOT NULL,
    Reference INTEGER NOT NULL,
    Read INTEGER NOT NULL,
    Write INTEGER NOT NULL,
    FOREIGN KEY(CallGroup) REFERENCES CallGroup(Id),
    FOREIGN KEY(Reference) REFERENCES Reference(Id)
);

CREATE TABLE LoopIterationReference
(
    LoopIteration INTEGER NOT NULL,
    Reference INTEGER NOT NULL,
    Read INTEGER NOT NULL,
    Write INTEGER NOT NULL,
    FOREIGN KEY(LoopIteration) REFERENCES LoopIteration(Id),
    FOREIGN KEY(Reference) REFERENCES Reference(Id)
);

CREATE TABLE LoopExecutionReference
(
    LoopExecution INTEGER NOT NULL,
    Reference INTEGER NOT NULL,
    Read INTEGER NOT NULL,
    Write INTEGER NOT NULL,
    FOREIGN KEY(LoopExecution) REFERENCES LoopExecution(Id),
    FOREIGN KEY(Reference) REFERENCES Reference(Id)
);

ALTER TABLE Function RENAME TO FunctionOld;
CREATE TABLE Function(
  Id INTEGER PRIMARY KEY NOT NULL,
  Name VARCHAR,
  Prototype VARCHAR,
  File INTEGER,
  Line INTEGER,
  Duration INTEGER,
  DurationMs INTEGER,
  FOREIGN KEY(File) REFERENCES File(Id),
  CONSTRAINT UniqueFunction UNIQUE (Name, Prototype, File, Line)
);

ALTER TABLE TagInstance RENAME TO TagInstanceOld;
CREATE TABLE TagInstance (
  Id	INTEGER PRIMARY KEY NOT NULL,
  Tag	INTEGER,
  Thread	INTEGER,
  Counter	INTEGER,
  Start INTEGER,
  End INTEGER,
  StartTime VARCHAR,
  EndTime VARCHAR,
  Duration INTEGER,
  DurationMs INTEGER,
  FOREIGN KEY(Tag) REFERENCES Tag(Id),
  FOREIGN KEY(Thread) REFERENCES Thread(Id)
);

ALTER TABLE Thread RENAME TO ThreadOld;
CREATE TABLE Thread(
  Id INTEGER PRIMARY KEY NOT NULL,
  CreateInstruction INTEGER,
  JoinInstruction INTEGER,
  Process INTEGER,
  StartTime VARCHAR,
  EndTSC INTEGER,
  EndTime VARCHAR,
  TSCPerMillisecond REAL,
  Call INTEGER,
  FOREIGN KEY(CreateInstruction) REFERENCES Instruction(Id),
  FOREIGN KEY(JoinInstruction) REFERENCES Instruction(Id),
  FOREIGN KEY(Call) REFERENCES Call(Id)
);
