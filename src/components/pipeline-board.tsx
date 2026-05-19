"use client";

import { useState, useRef } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";
import { createClient } from "@/lib/supabase/client";
import { PipelineCardModal } from "./pipeline-card-modal";

// ─── Types ───────────────────────────────────────────────────────────────────

type Column = {
  id: string;
  name: string;
  color: string;
  position: number;
};

type Card = {
  id: string;
  column_id: string;
  pipeline_id: string;
  title: string;
  notes: string | null;
  position: number;
  created_at: string;
};

type CardFile = {
  id: string;
  card_id: string;
  name: string;
  size: number | null;
  mime_type: string | null;
  storage_path: string;
  created_at: string;
};

type Comment = {
  id: string;
  card_id: string;
  user_id: string;
  text: string;
  created_at: string;
};

type Activity = {
  id: string;
  card_id: string;
  user_id: string | null;
  type: string;
  payload: any;
  created_at: string;
};

// ─── Constants ───────────────────────────────────────────────────────────────

const PRESET_COLORS = [
  "#6366f1",
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#64748b",
];

const BOARD_BG = "#0d1117";
const COL_BG = "#161b22";
const CARD_BG = "#21262d";
const CARD_HOVER_BG = "#2d333b";
const BORDER_COLOR = "#30363d";
const TEXT_PRIMARY = "#e6edf3";
const TEXT_MUTED = "#7d8590";

// ─── Props ───────────────────────────────────────────────────────────────────

interface PipelineBoardProps {
  pipelineId: string;
  pipelineName: string;
  me: { id: string; name: string };
  initialColumns: Column[];
  initialCards: Card[];
  teamNames: Record<string, string>;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function midPosition(a: number | undefined, b: number | undefined): number {
  const lo = a ?? 0;
  const hi = b ?? lo + 65536;
  return (lo + hi) / 2;
}

// ─── Color Picker ────────────────────────────────────────────────────────────

function ColorPicker({
  value,
  onChange,
  onClose,
}: {
  value: string;
  onChange: (c: string) => void;
  onClose: () => void;
}) {
  return (
    <div
      style={{
        position: "absolute",
        top: "100%",
        left: 0,
        zIndex: 50,
        background: "#1c2128",
        border: `1px solid ${BORDER_COLOR}`,
        borderRadius: 8,
        padding: 8,
        display: "flex",
        gap: 6,
        flexWrap: "wrap",
        width: 140,
        marginTop: 4,
        boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
      }}
    >
      {PRESET_COLORS.map((c) => (
        <button
          key={c}
          onClick={() => {
            onChange(c);
            onClose();
          }}
          style={{
            width: 24,
            height: 24,
            borderRadius: 4,
            background: c,
            border: c === value ? "2px solid #fff" : "2px solid transparent",
            cursor: "pointer",
            padding: 0,
          }}
          title={c}
        />
      ))}
    </div>
  );
}

// ─── Column Header ────────────────────────────────────────────────────────────

function ColumnHeader({
  col,
  cardCount,
  isFirst,
  isLast,
  onRename,
  onRecolor,
  onMoveLeft,
  onMoveRight,
  onDelete,
}: {
  col: Column;
  cardCount: number;
  isFirst: boolean;
  isLast: boolean;
  onRename: (name: string) => void;
  onRecolor: (color: string) => void;
  onMoveLeft: () => void;
  onMoveRight: () => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(col.name);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function commitRename() {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== col.name) onRename(trimmed);
    setEditing(false);
  }

  return (
    <div
      style={{
        padding: "12px 12px 8px",
        borderBottom: `1px solid ${BORDER_COLOR}`,
        position: "relative",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          marginBottom: 2,
        }}
      >
        {/* Colored dot + color picker */}
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setShowColorPicker((v) => !v)}
            title="Cambiar color"
            style={{
              width: 12,
              height: 12,
              borderRadius: "50%",
              background: col.color,
              border: "none",
              cursor: "pointer",
              padding: 0,
              flexShrink: 0,
            }}
          />
          {showColorPicker && (
            <ColorPicker
              value={col.color}
              onChange={onRecolor}
              onClose={() => setShowColorPicker(false)}
            />
          )}
        </div>

        {/* Editable name */}
        {editing ? (
          <input
            ref={inputRef}
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitRename();
              if (e.key === "Escape") {
                setDraft(col.name);
                setEditing(false);
              }
            }}
            style={{
              flex: 1,
              background: "#0d1117",
              border: `1px solid ${col.color}`,
              borderRadius: 4,
              color: TEXT_PRIMARY,
              fontSize: 13,
              fontWeight: 600,
              padding: "2px 6px",
              outline: "none",
            }}
          />
        ) : (
          <span
            onClick={() => {
              setDraft(col.name);
              setEditing(true);
            }}
            title="Editar nombre"
            style={{
              flex: 1,
              color: TEXT_PRIMARY,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {col.name}
          </span>
        )}

        {/* Card count badge */}
        <span
          style={{
            fontSize: 11,
            color: TEXT_MUTED,
            background: "#0d1117",
            borderRadius: 10,
            padding: "1px 7px",
            fontWeight: 500,
            flexShrink: 0,
          }}
        >
          {cardCount}
        </span>
      </div>

      {/* Action buttons row */}
      <div style={{ display: "flex", gap: 2, marginTop: 4 }}>
        <button
          onClick={onMoveLeft}
          disabled={isFirst}
          title="Mover izquierda"
          style={{
            background: "none",
            border: "none",
            color: isFirst ? "#3d444d" : TEXT_MUTED,
            cursor: isFirst ? "default" : "pointer",
            fontSize: 14,
            padding: "2px 4px",
            borderRadius: 4,
            lineHeight: 1,
          }}
        >
          ←
        </button>
        <button
          onClick={onMoveRight}
          disabled={isLast}
          title="Mover derecha"
          style={{
            background: "none",
            border: "none",
            color: isLast ? "#3d444d" : TEXT_MUTED,
            cursor: isLast ? "default" : "pointer",
            fontSize: 14,
            padding: "2px 4px",
            borderRadius: 4,
            lineHeight: 1,
          }}
        >
          →
        </button>
        <div style={{ flex: 1 }} />
        {cardCount === 0 && (
          <button
            onClick={onDelete}
            title="Eliminar columna"
            style={{
              background: "none",
              border: "none",
              color: "#6e7681",
              cursor: "pointer",
              fontSize: 13,
              padding: "2px 5px",
              borderRadius: 4,
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Card Tile ────────────────────────────────────────────────────────────────

function CardTile({
  card,
  index,
  onClick,
}: {
  card: Card;
  index: number;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <Draggable draggableId={card.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={onClick}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          style={{
            background: snapshot.isDragging
              ? "#2d333b"
              : hovered
              ? CARD_HOVER_BG
              : CARD_BG,
            border: `1px solid ${snapshot.isDragging ? "#454c56" : BORDER_COLOR}`,
            borderRadius: 6,
            padding: "10px 12px",
            cursor: "pointer",
            boxShadow: snapshot.isDragging
              ? "0 8px 24px rgba(0,0,0,0.6)"
              : "none",
            transition: "background 0.1s, border-color 0.1s",
            ...provided.draggableProps.style,
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 13,
              color: TEXT_PRIMARY,
              lineHeight: 1.4,
              wordBreak: "break-word",
            }}
          >
            {card.title}
          </p>
        </div>
      )}
    </Draggable>
  );
}

// ─── Add Card Form ────────────────────────────────────────────────────────────

function AddCardForm({
  onAdd,
  onCancel,
}: {
  onAdd: (title: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    const t = title.trim();
    if (!t) return;
    setLoading(true);
    await onAdd(t);
    setLoading(false);
  }

  return (
    <div style={{ padding: "8px 12px 12px" }}>
      <textarea
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
          if (e.key === "Escape") onCancel();
        }}
        placeholder="Nombre del lead..."
        rows={2}
        style={{
          width: "100%",
          background: "#0d1117",
          border: `1px solid #3d8bff`,
          borderRadius: 6,
          color: TEXT_PRIMARY,
          fontSize: 13,
          padding: "8px 10px",
          resize: "none",
          outline: "none",
          boxSizing: "border-box",
          fontFamily: "inherit",
        }}
      />
      <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
        <button
          onClick={submit}
          disabled={loading || !title.trim()}
          style={{
            background: "#238636",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            padding: "6px 14px",
            fontSize: 13,
            cursor: loading || !title.trim() ? "default" : "pointer",
            opacity: loading || !title.trim() ? 0.6 : 1,
            fontWeight: 500,
          }}
        >
          Agregar
        </button>
        <button
          onClick={onCancel}
          style={{
            background: "none",
            color: TEXT_MUTED,
            border: `1px solid ${BORDER_COLOR}`,
            borderRadius: 6,
            padding: "6px 12px",
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

// ─── Add Column Form ──────────────────────────────────────────────────────────

function AddColumnForm({
  onAdd,
  onCancel,
}: {
  onAdd: (name: string, color: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [showPicker, setShowPicker] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit() {
    const n = name.trim();
    if (!n) return;
    setLoading(true);
    await onAdd(n, color);
    setLoading(false);
  }

  return (
    <div
      style={{
        width: 240,
        background: COL_BG,
        border: `1px solid ${BORDER_COLOR}`,
        borderRadius: 10,
        padding: 12,
        flexShrink: 0,
        alignSelf: "flex-start",
      }}
    >
      <p
        style={{
          margin: "0 0 8px",
          fontSize: 12,
          fontWeight: 600,
          color: TEXT_MUTED,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}
      >
        Nueva columna
      </p>
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
          if (e.key === "Escape") onCancel();
        }}
        placeholder="Nombre..."
        style={{
          width: "100%",
          background: "#0d1117",
          border: `1px solid ${BORDER_COLOR}`,
          borderRadius: 6,
          color: TEXT_PRIMARY,
          fontSize: 13,
          padding: "7px 10px",
          outline: "none",
          boxSizing: "border-box",
          fontFamily: "inherit",
          marginBottom: 8,
        }}
      />

      {/* Color picker */}
      <div style={{ position: "relative", marginBottom: 10 }}>
        <button
          onClick={() => setShowPicker((v) => !v)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "none",
            border: `1px solid ${BORDER_COLOR}`,
            borderRadius: 6,
            padding: "5px 10px",
            cursor: "pointer",
            color: TEXT_MUTED,
            fontSize: 12,
          }}
        >
          <span
            style={{
              width: 14,
              height: 14,
              borderRadius: 3,
              background: color,
              display: "inline-block",
            }}
          />
          Color
        </button>
        {showPicker && (
          <ColorPicker
            value={color}
            onChange={setColor}
            onClose={() => setShowPicker(false)}
          />
        )}
      </div>

      <div style={{ display: "flex", gap: 6 }}>
        <button
          onClick={submit}
          disabled={loading || !name.trim()}
          style={{
            background: "#238636",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            padding: "6px 14px",
            fontSize: 13,
            cursor: loading || !name.trim() ? "default" : "pointer",
            opacity: loading || !name.trim() ? 0.6 : 1,
            fontWeight: 500,
          }}
        >
          Crear
        </button>
        <button
          onClick={onCancel}
          style={{
            background: "none",
            color: TEXT_MUTED,
            border: `1px solid ${BORDER_COLOR}`,
            borderRadius: 6,
            padding: "6px 12px",
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

// ─── Board ────────────────────────────────────────────────────────────────────

export function PipelineBoard({
  pipelineId,
  pipelineName,
  me,
  initialColumns,
  initialCards,
  teamNames,
}: PipelineBoardProps) {
  const supabase = createClient();

  const [columns, setColumns] = useState<Column[]>(
    [...initialColumns].sort((a, b) => a.position - b.position)
  );
  const [cards, setCards] = useState<Card[]>(
    [...initialCards].sort((a, b) => a.position - b.position)
  );
  const [openCardId, setOpenCardId] = useState<string | null>(null);
  const [addingCardToCol, setAddingCardToCol] = useState<string | null>(null);
  const [showAddColumn, setShowAddColumn] = useState(false);

  // ── Column operations ─────────────────────────────────────────────────────

  async function handleRenameColumn(colId: string, name: string) {
    setColumns((prev) =>
      prev.map((c) => (c.id === colId ? { ...c, name } : c))
    );
    await supabase
      .from("pipeline_columns")
      .update({ name })
      .eq("id", colId);
  }

  async function handleRecolorColumn(colId: string, color: string) {
    setColumns((prev) =>
      prev.map((c) => (c.id === colId ? { ...c, color } : c))
    );
    await supabase
      .from("pipeline_columns")
      .update({ color })
      .eq("id", colId);
  }

  async function handleMoveColumn(colId: string, direction: "left" | "right") {
    const sorted = [...columns].sort((a, b) => a.position - b.position);
    const idx = sorted.findIndex((c) => c.id === colId);
    const swapIdx = direction === "left" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;

    const a = sorted[idx];
    const b = sorted[swapIdx];
    const newCols = columns.map((c) => {
      if (c.id === a.id) return { ...c, position: b.position };
      if (c.id === b.id) return { ...c, position: a.position };
      return c;
    });
    setColumns(newCols.sort((x, y) => x.position - y.position));

    await Promise.all([
      supabase
        .from("pipeline_columns")
        .update({ position: b.position })
        .eq("id", a.id),
      supabase
        .from("pipeline_columns")
        .update({ position: a.position })
        .eq("id", b.id),
    ]);
  }

  async function handleDeleteColumn(colId: string) {
    setColumns((prev) => prev.filter((c) => c.id !== colId));
    await supabase.from("pipeline_columns").delete().eq("id", colId);
  }

  async function handleAddColumn(name: string, color: string) {
    const maxPos =
      columns.length > 0 ? Math.max(...columns.map((c) => c.position)) : 0;
    const position = maxPos + 1000;

    const { data, error } = await supabase
      .from("pipeline_columns")
      .insert({ pipeline_id: pipelineId, name, color, position })
      .select()
      .single();

    if (!error && data) {
      setColumns((prev) =>
        [...prev, data as Column].sort((a, b) => a.position - b.position)
      );
    }
    setShowAddColumn(false);
  }

  // ── Card operations ───────────────────────────────────────────────────────

  async function handleAddCard(colId: string, title: string) {
    const colCards = cards
      .filter((c) => c.column_id === colId)
      .sort((a, b) => a.position - b.position);
    const position =
      colCards.length > 0
        ? colCards[colCards.length - 1].position + 1000
        : 1000;

    const { data, error } = await supabase
      .from("pipeline_cards")
      .insert({ pipeline_id: pipelineId, column_id: colId, title, position, notes: null })
      .select()
      .single();

    if (!error && data) {
      const newCard = data as Card;
      setCards((prev) => [...prev, newCard]);

      // Insert activity
      await supabase.from("pipeline_card_activity").insert({
        card_id: newCard.id,
        user_id: me.id,
        type: "created",
        payload: { title },
      });
    }
    setAddingCardToCol(null);
  }

  // ── Drag & Drop ───────────────────────────────────────────────────────────

  function onDragEnd(result: DropResult) {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    )
      return;

    const srcColId = source.droppableId;
    const dstColId = destination.droppableId;

    const dstCards = cards
      .filter((c) => c.column_id === dstColId && c.id !== draggableId)
      .sort((a, b) => a.position - b.position);

    const prevCard = dstCards[destination.index - 1];
    const nextCard = dstCards[destination.index];

    const newPosition = midPosition(prevCard?.position, nextCard?.position);

    setCards((prev) =>
      prev.map((c) =>
        c.id === draggableId
          ? { ...c, column_id: dstColId, position: newPosition }
          : c
      )
    );

    supabase
      .from("pipeline_cards")
      .update({ column_id: dstColId, position: newPosition })
      .eq("id", draggableId);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  function cardsForColumn(colId: string): Card[] {
    return cards
      .filter((c) => c.column_id === colId)
      .sort((a, b) => a.position - b.position);
  }

  const openCard = openCardId ? cards.find((c) => c.id === openCardId) : null;
  const openCardColumn = openCard
    ? columns.find((c) => c.id === openCard.column_id)
    : null;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <DragDropContext onDragEnd={onDragEnd}>
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            gap: 12,
            overflowX: "auto",
            overflowY: "hidden",
            padding: "16px 20px 20px",
            background: BOARD_BG,
            minHeight: "calc(100vh - 120px)",
            alignItems: "flex-start",
          }}
        >
          {columns.map((col, colIdx) => {
            const colCards = cardsForColumn(col.id);
            const isFirst = colIdx === 0;
            const isLast = colIdx === columns.length - 1;
            const isAddingHere = addingCardToCol === col.id;

            return (
              <div
                key={col.id}
                style={{
                  width: 280,
                  flexShrink: 0,
                  background: COL_BG,
                  border: `1px solid ${BORDER_COLOR}`,
                  borderRadius: 10,
                  display: "flex",
                  flexDirection: "column",
                  maxHeight: "calc(100vh - 140px)",
                }}
              >
                <ColumnHeader
                  col={col}
                  cardCount={colCards.length}
                  isFirst={isFirst}
                  isLast={isLast}
                  onRename={(name) => handleRenameColumn(col.id, name)}
                  onRecolor={(color) => handleRecolorColumn(col.id, color)}
                  onMoveLeft={() => handleMoveColumn(col.id, "left")}
                  onMoveRight={() => handleMoveColumn(col.id, "right")}
                  onDelete={() => handleDeleteColumn(col.id)}
                />

                <Droppable droppableId={col.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      style={{
                        flex: 1,
                        overflowY: "auto",
                        padding: "8px 10px",
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                        background: snapshot.isDraggingOver
                          ? "#1a2030"
                          : "transparent",
                        transition: "background 0.15s",
                        minHeight: 40,
                      }}
                    >
                      {colCards.map((card, idx) => (
                        <CardTile
                          key={card.id}
                          card={card}
                          index={idx}
                          onClick={() => setOpenCardId(card.id)}
                        />
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>

                {/* Add card */}
                {isAddingHere ? (
                  <AddCardForm
                    onAdd={(title) => handleAddCard(col.id, title)}
                    onCancel={() => setAddingCardToCol(null)}
                  />
                ) : (
                  <button
                    onClick={() => setAddingCardToCol(col.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      background: "none",
                      border: "none",
                      borderTop: `1px solid ${BORDER_COLOR}`,
                      color: TEXT_MUTED,
                      fontSize: 13,
                      padding: "10px 14px",
                      cursor: "pointer",
                      borderRadius: "0 0 10px 10px",
                      transition: "color 0.1s, background 0.1s",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.color =
                        TEXT_PRIMARY;
                      (e.currentTarget as HTMLButtonElement).style.background =
                        "#1a2028";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.color =
                        TEXT_MUTED;
                      (e.currentTarget as HTMLButtonElement).style.background =
                        "none";
                    }}
                  >
                    <span style={{ fontSize: 16, lineHeight: 1 }}>+</span>
                    Agregar lead
                  </button>
                )}
              </div>
            );
          })}

          {/* Add column */}
          {showAddColumn ? (
            <AddColumnForm
              onAdd={handleAddColumn}
              onCancel={() => setShowAddColumn(false)}
            />
          ) : (
            <button
              onClick={() => setShowAddColumn(true)}
              style={{
                flexShrink: 0,
                alignSelf: "flex-start",
                display: "flex",
                alignItems: "center",
                gap: 6,
                background: "rgba(255,255,255,0.05)",
                border: `1px dashed ${BORDER_COLOR}`,
                borderRadius: 10,
                color: TEXT_MUTED,
                fontSize: 13,
                padding: "10px 18px",
                cursor: "pointer",
                transition: "background 0.1s, color 0.1s",
                whiteSpace: "nowrap",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background =
                  "rgba(255,255,255,0.09)";
                (e.currentTarget as HTMLButtonElement).style.color =
                  TEXT_PRIMARY;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background =
                  "rgba(255,255,255,0.05)";
                (e.currentTarget as HTMLButtonElement).style.color = TEXT_MUTED;
              }}
            >
              <span style={{ fontSize: 16 }}>+</span>
              Columna
            </button>
          )}
        </div>
      </DragDropContext>

      {/* Card detail modal */}
      {openCardId && (
        <PipelineCardModal
          cardId={openCardId}
          pipelineId={pipelineId}
          meId={me.id}
          meName={me.name}
          columnName={openCardColumn?.name ?? ""}
          teamNames={teamNames}
          onClose={() => setOpenCardId(null)}
          onTitleChange={(_id, newTitle) => {
            setCards((prev) =>
              prev.map((c) =>
                c.id === openCardId ? { ...c, title: newTitle } : c
              )
            );
          }}
        />
      )}
    </>
  );
}
