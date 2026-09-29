// PAUSE — una sezione (capitolo) della lettura verticale continua: il testo
// vive direttamente sul fondo, senza card. Numero del capitolo grande e quasi
// trasparente come elemento grafico, occhiello "CAPITOLO X" nel colore del
// tema, titolo, corpo in paragrafi brevi. Nessun contenuto extra.
import { useEffect, useState } from "react";
import { View, Text } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { Chapter, Story } from "@/src/api";
import { makeStyles, useTheme, spacing, typography, withAlpha } from "@/src/theme";
import { HighlightedTitle } from "@/src/components/highlighted-title";

// Larghezza di lettura controllata: su tablet il testo non si allarga oltre
// una riga confortevole, su telefono usa tutta la larghezza meno i margini.
export const READER_MAX_W = 640;
const LONG_PARAGRAPH = 520;
// Geometria della sezione (deve coincidere con gli stili qui sotto).
const NORMAL_PAD = { top: spacing.xxl + spacing.md, bottom: spacing.xl };
const TIGHT_PAD = { top: spacing.xl, bottom: spacing.lg };
const SECTION_GAP = spacing.sm + 2;
// Sforo massimo (punti) oltre la schermata che la versione compatta può assorbire.
const TIGHT_MAX_OVERFLOW = 120;

// Solo presentazione: il testo resta identico, ma un capitolo molto lungo
// viene mostrato in due paragrafi spezzati alla fine di una frase.
export function splitParagraphs(body: string): string[] {
  const lines = body.split(/\n+/).map((s) => s.trim()).filter(Boolean);
  if (lines.length > 1) return lines;
  const text = lines[0] ?? "";
  if (text.length <= LONG_PARAGRAPH) return [text];
  const mid = text.length / 2;
  let cut = -1;
  const re = /[.!?»"”]\s+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const end = m.index + m[0].length;
    if (cut < 0 || Math.abs(end - mid) < Math.abs(cut - mid)) cut = end;
  }
  if (cut <= 0 || cut >= text.length - 40) return [text];
  return [text.slice(0, cut).trim(), text.slice(cut).trim()];
}

export function SectionDivider({ color }: { color?: string }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const tint = color ?? colors.cyan;
  return (
    <View style={styles.divider} pointerEvents="none">
      <LinearGradient
        colors={[withAlpha(tint, 0), withAlpha(tint, 0.55), withAlpha(tint, 0)]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.dividerLine}
      />
    </View>
  );
}

// Solo presentazione: le mini lezioni numerano i passi nel titolo
// ("Passo 3 — Osserva"): nel lettore il numero non serve, resta il titolo.
export function stripStepPrefix(title: string): string {
  return title.replace(/^\s*(passo|step)\s*\d+\s*[—–\-:·]\s*/i, "").trim() || title;
}

// Un capitolo occupa una schermata: in alto numero, occhiello, titolo e testo;
// in fondo — se c'è un capitolo dopo — solo "CAPITOLO 02" e il suo titolo,
// attenuati e compatti: un'anticipazione, mai il testo. Il capitolo successivo vero inizia
// alla schermata seguente (la lettura avanza a capitoli, non a scorrimento).
export function ChapterSection({ chapter, story, eyebrow, next, minHeight, pageOverlap = 0 }: {
  chapter: Chapter; story: Story; eyebrow: string;
  /** Capitolo seguente (anticipazione in fondo alla schermata). */
  next?: Chapter | null;
  /** Altezza della schermata di lettura: il capitolo la riempie e l'anticipazione poggia sul fondo. */
  minHeight?: number;
  /** Capitoli su più schermate: di quanto la schermata seguente riprende la precedente (barra + una riga), così nessuna riga resta nascosta. */
  pageOverlap?: number;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  // Un solo colore per tutti i capitoli di tutte le storie: l'accento del tema
  // corrente dell'app (base = cyan), mai la categoria della storia.
  const tint = colors.brand;
  const number = String(chapter.number).padStart(2, "0");
  // Testo più alto di una schermata (caratteri grandi, telefoni bassi): il
  // capitolo occupa un numero intero di schermate, così l'anticipazione resta
  // in fondo all'ultima e il capitolo seguente inizia sempre su una schermata
  // nuova — mai la stessa intestazione due volte di seguito.
  // L'anticipazione si misura a layout (non si stima): così una schermata in
  // più compare solo quando il testo davvero non ci sta, mai per pochi punti.
  // Se sfora di poco, prima si prova la versione compatta (spazi e interlinea
  // ridotti): solo se non basta il capitolo prende una schermata in più.
  const [contentH, setContentH] = useState(0);
  const [previewH, setPreviewH] = useState(0);
  const [tight, setTight] = useState(false);
  const pad = tight ? TIGHT_PAD : NORMAL_PAD;
  const total = pad.top + contentH + (next ? SECTION_GAP + previewH : 0) + pad.bottom;
  const measured = contentH > 0 && (!next || previewH > 0);
  const overflow = minHeight && measured ? total - minHeight : 0;
  useEffect(() => { setTight(false); }, [minHeight]);
  useEffect(() => {
    if (!tight && overflow > 0 && overflow <= TIGHT_MAX_OVERFLOW) setTight(true);
  }, [tight, overflow]);
  const pages = minHeight && measured ? Math.max(1, Math.ceil((total - pageOverlap) / (minHeight - pageOverlap))) : 1;
  const sectionH = minHeight ? pages * minHeight - (pages - 1) * pageOverlap : undefined;
  return (
    <View style={[styles.section, tight && styles.sectionTight, sectionH ? { minHeight: sectionH } : null]} testID={`deep-dive-chapter-${chapter.number}`}>
      <View style={styles.content} onLayout={(e) => { const h = Math.ceil(e.nativeEvent.layout.height); if (h !== contentH) setContentH(h); }}>
      <View>
        {/* Numero grande e quasi trasparente: elemento grafico, non informazione. */}
        <Text style={[styles.bigNumber, tight && styles.bigNumberTight, { color: withAlpha(tint, 0.13) }]} pointerEvents="none" testID={`reader-chapter-number-${chapter.number}`}>{number}</Text>
        <Text style={[styles.eyebrow, tight && styles.eyebrowTight, { color: tint }]} testID={`reader-chapter-eyebrow-${chapter.number}`}>{eyebrow.toUpperCase()}</Text>
        <HighlightedTitle
          title={stripStepPrefix(chapter.title)}
          highlight={story.highlight_words}
          highlightColor={tint}
          style={[styles.title, tight && styles.titleTight]}
        />
      </View>
      <View style={[styles.body, tight && styles.bodyTight]}>
        {splitParagraphs(chapter.body).map((p, i) => (
          <Text key={i} style={[styles.paragraph, tight && styles.paragraphTight]}>{p}</Text>
        ))}
      </View>
      </View>
      {next ? (
        // Anticipazione compatta: solo numero e titolo del capitolo seguente
        // (niente numero grande in filigrana: quello appartiene al capitolo vero).
        <View style={[styles.preview, tight && styles.previewTight]} testID={`reader-chapter-preview-${next.number}`}
          onLayout={(e) => { const h = Math.ceil(e.nativeEvent.layout.height); if (h !== previewH) setPreviewH(h); }}>
          <SectionDivider color={tint} />
          <Text style={[styles.eyebrow, styles.previewEyebrow, { color: withAlpha(tint, 0.6) }]} testID={`reader-chapter-preview-number-${next.number}`}>
            {eyebrow.toUpperCase()} {String(next.number).padStart(2, "0")}
          </Text>
          <HighlightedTitle
            title={stripStepPrefix(next.title)}
            highlight={story.highlight_words}
            highlightColor={withAlpha(tint, 0.55)}
            style={[styles.title, styles.previewTitle]}
          />
        </View>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  section: {
    width: "100%", maxWidth: READER_MAX_W, alignSelf: "center",
    paddingHorizontal: spacing.xl, paddingTop: NORMAL_PAD.top, paddingBottom: NORMAL_PAD.bottom,
    gap: SECTION_GAP,
  },
  bigNumber: {
    position: "absolute", top: -spacing.lg, left: -4,
    fontFamily: typography.displayBold, fontSize: 96, lineHeight: 100, letterSpacing: -4,
  },
  divider: { alignItems: "center", marginBottom: spacing.md },
  dividerLine: { width: "62%", height: 1, borderRadius: 1 },
  eyebrow: { fontFamily: typography.bodyBold, fontSize: 12, letterSpacing: 3, paddingTop: spacing.xxl, marginBottom: spacing.sm + 2 },
  title: {
    color: colors.textWarm, fontFamily: typography.displayBold, fontSize: 31, lineHeight: 37, letterSpacing: -0.7,
  },
  content: { gap: spacing.sm + 2 },
  body: { gap: spacing.md + 2, marginTop: spacing.sm },
  // Anticipazione del capitolo seguente: sul fondo della schermata, attenuata.
  preview: { marginTop: "auto", paddingTop: spacing.lg },
  previewEyebrow: { paddingTop: 0, marginBottom: spacing.xs },
  previewTitle: { fontSize: 22, lineHeight: 27, opacity: 0.5 },
  paragraph: { color: colors.textWarmSecondary, fontFamily: typography.body, fontSize: 17.5, lineHeight: 31, letterSpacing: 0.1 },
  // Versione compatta (capitolo che sfora di poco la schermata): stessi
  // elementi, spazi e interlinea ridotti, così resta su una schermata sola.
  sectionTight: { paddingTop: TIGHT_PAD.top, paddingBottom: TIGHT_PAD.bottom },
  bigNumberTight: { top: -spacing.md, fontSize: 76, lineHeight: 80, letterSpacing: -3 },
  eyebrowTight: { paddingTop: spacing.md, marginBottom: spacing.sm },
  titleTight: { fontSize: 28, lineHeight: 33 },
  bodyTight: { gap: spacing.sm + 2, marginTop: spacing.xs },
  paragraphTight: { fontSize: 16.5, lineHeight: 27 },
  previewTight: { paddingTop: spacing.sm + 2 },
}));
