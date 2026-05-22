// =============================================================================
// DreamDiary — DreamDetailScreen
// =============================================================================
// Displays the full detail view for a single dream. Loads dream + tags from
// Supabase via route.params.dreamId. Supports inline transcript editing, delete
// with confirmation alert, and navigation to ShareCard.
// =============================================================================

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Alert,
  TextInput,
  ActivityIndicator,
  Share,
  Platform,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';

import { useDreamStore } from '../../store';
import {
  getDreamById,
  updateDream as updateDreamInDB,
  deleteDream as deleteDreamFromDB,
} from '../../services/supabase';
import {
  formatDate,
  formatTime,
  getEmotionColor,
  generateDreamTitle,
} from '../../utils';

// =============================================================================
// Constants
// =============================================================================

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const COLORS = {
  bg: '#0D0D1A',
  card: '#1A1A2E',
  primary: '#7B5EA7',
  accent: '#C084FC',
  gold: '#F59E0B',
  text: '#F1F0FF',
  muted: '#8B8BAE',
  success: '#10B981',
  danger: '#EF4444',
  border: 'rgba(123, 94, 167, 0.25)',
  cardBorder: 'rgba(241, 240, 255, 0.06)',
  inputBg: '#12122A',
};

// =============================================================================
// VividnessBar — 10 dot indicators
// =============================================================================

function VividnessBar({ score }) {
  const safeScore = typeof score === 'number' ? Math.min(10, Math.max(0, score)) : 0;
  return (
    <View style={styles.vividnessRow}>
      <Text style={styles.vividnessLabel}>Vividness</Text>
      <View style={styles.vividnessDots}>
        {Array.from({ length: 10 }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.vividnessDot,
              i < safeScore
                ? styles.vividnessDotFilled
                : styles.vividnessDotEmpty,
            ]}
          />
        ))}
      </View>
      <Text style={styles.vividnessScore}>{safeScore}/10</Text>
    </View>
  );
}

// =============================================================================
// EmotionChip
// =============================================================================

function EmotionChip({ tag }) {
  const color = getEmotionColor(tag.label);
  const pct = tag.confidence_score != null
    ? `${Math.round(tag.confidence_score * 100)}%`
    : null;
  return (
    <View
      style={[
        styles.emotionChip,
        { backgroundColor: `${color}20`, borderColor: `${color}55` },
      ]}
    >
      <View style={[styles.emotionDot, { backgroundColor: color }]} />
      <Text style={[styles.emotionChipLabel, { color }]}>
        {tag.label.charAt(0).toUpperCase() + tag.label.slice(1)}
      </Text>
      {pct && <Text style={[styles.emotionChipPct, { color }]}>{pct}</Text>}
    </View>
  );
}

// =============================================================================
// SymbolTag
// =============================================================================

function SymbolTag({ tag }) {
  const pct = tag.confidence_score != null
    ? `${Math.round(tag.confidence_score * 100)}%`
    : null;
  return (
    <View style={styles.symbolTag}>
      <Text style={styles.symbolTagLabel}>
        {tag.label.charAt(0).toUpperCase() + tag.label.slice(1)}
      </Text>
      {pct && <Text style={styles.symbolTagPct}>{pct}</Text>}
    </View>
  );
}

// =============================================================================
// SectionHeader
// =============================================================================

function SectionHeader({ icon, title }) {
  return (
    <View style={styles.sectionHeader}>
      <Ionicons name={icon} size={16} color={COLORS.accent} />
      <Text style={styles.sectionHeaderText}>{title}</Text>
    </View>
  );
}

// =============================================================================
// DreamDetailScreen
// =============================================================================

export default function DreamDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { dreamId } = route.params ?? {};

  // Store
  const updateDreamInStore = useDreamStore((s) => s.updateDream);
  const removeDreamFromStore = useDreamStore((s) => s.removeDream);

  // State
  const [dream, setDream] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedTranscript, setEditedTranscript] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const transcriptRef = useRef(null);

  // ---------------------------------------------------------------------------
  // Load dream
  // ---------------------------------------------------------------------------

  const loadDream = useCallback(async () => {
    if (!dreamId) {
      setError('No dream ID provided.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await getDreamById(dreamId);
      setDream(data);
      setEditedTranscript(data?.transcript ?? '');
    } catch (err) {
      console.error('[DreamDetail] loadDream error:', err);
      setError('Failed to load dream. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [dreamId]);

  useEffect(() => {
    loadDream();
  }, [loadDream]);

  // ---------------------------------------------------------------------------
  // Tags helpers
  // ---------------------------------------------------------------------------

  const tags = dream?.dream_tags ?? [];
  const emotionTags = tags.filter((t) => t.type === 'emotion');
  const symbolTags = tags.filter((t) => t.type === 'symbol');

  // ---------------------------------------------------------------------------
  // Edit handlers
  // ---------------------------------------------------------------------------

  const handleStartEdit = useCallback(() => {
    setEditedTranscript(dream?.transcript ?? '');
    setIsEditing(true);
    setTimeout(() => transcriptRef.current?.focus(), 100);
  }, [dream]);

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false);
    setEditedTranscript(dream?.transcript ?? '');
  }, [dream]);

  const handleSaveEdit = useCallback(async () => {
    if (!dream?.id) return;
    setSaving(true);
    try {
      const updated = await updateDreamInDB(dream.id, {
        transcript: editedTranscript,
      });
      setDream((prev) => ({ ...prev, ...updated }));
      updateDreamInStore(dream.id, { transcript: editedTranscript });
      setIsEditing(false);
    } catch (err) {
      console.error('[DreamDetail] save error:', err);
      Alert.alert('Save Failed', err?.message ?? 'Could not save changes.');
    } finally {
      setSaving(false);
    }
  }, [dream, editedTranscript, updateDreamInStore]);

  // ---------------------------------------------------------------------------
  // Delete handler
  // ---------------------------------------------------------------------------

  const handleDelete = useCallback(() => {
    Alert.alert(
      'Delete Dream',
      'Are you sure you want to permanently delete this dream? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await deleteDreamFromDB(dream.id);
              removeDreamFromStore(dream.id);
              navigation.goBack();
            } catch (err) {
              console.error('[DreamDetail] delete error:', err);
              Alert.alert(
                'Delete Failed',
                err?.message ?? 'Could not delete the dream.'
              );
              setDeleting(false);
            }
          },
        },
      ]
    );
  }, [dream, removeDreamFromStore, navigation]);

  // ---------------------------------------------------------------------------
  // Share handler
  // ---------------------------------------------------------------------------

  const handleShare = useCallback(() => {
    if (!dream) return;
    navigation.navigate('ShareCard', { dream });
  }, [dream, navigation]);

  const handleNativeShare = useCallback(async () => {
    if (!dream) return;
    try {
      const title = generateDreamTitle(dream.ai_summary ?? dream.transcript);
      const message = [
        `🌙 ${title}`,
        '',
        dream.ai_summary ?? dream.transcript ?? '',
        '',
        'Recorded with DreamDiary',
      ].join('\n');
      await Share.share({ title, message });
    } catch (err) {
      // User cancelled — not an error
    }
  }, [dream]);

  // ---------------------------------------------------------------------------
  // Loading / Error states
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <View style={styles.centerState}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
        <ActivityIndicator size="large" color={COLORS.accent} />
        <Text style={styles.loadingText}>Loading dream…</Text>
      </View>
    );
  }

  if (error || !dream) {
    return (
      <View style={styles.centerState}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
        <Ionicons name="alert-circle-outline" size={48} color={COLORS.danger} />
        <Text style={styles.errorTitle}>Something went wrong</Text>
        <Text style={styles.errorBody}>{error ?? 'Dream not found.'}</Text>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backFallback}
          activeOpacity={0.8}
        >
          <Text style={styles.backFallbackText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ---------------------------------------------------------------------------
  // Derived display values
  // ---------------------------------------------------------------------------

  const dateStr = formatDate(dream.recorded_at ?? dream.created_at);
  const timeStr = formatTime(dream.recorded_at ?? dream.created_at);
  const title = generateDreamTitle(dream.ai_summary ?? dream.transcript);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* ── Top header bar ── */}
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.topBarBtn}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="chevron-back" size={22} color={COLORS.text} />
          </TouchableOpacity>

          <Text style={styles.topBarTitle} numberOfLines={1}>
            {title}
          </Text>

          <View style={styles.topBarRight}>
            <TouchableOpacity
              onPress={handleNativeShare}
              style={styles.topBarBtn}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Share dream"
            >
              <Ionicons name="share-outline" size={20} color={COLORS.muted} />
            </TouchableOpacity>
            {!isEditing && (
              <TouchableOpacity
                onPress={handleStartEdit}
                style={[styles.topBarBtn, styles.editBtn]}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Edit dream"
              >
                <Text style={styles.editBtnText}>Edit</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ── Scrollable content ── */}
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Date + Time */}
          <View style={styles.dateTimeRow}>
            <Ionicons
              name="moon-outline"
              size={16}
              color={COLORS.muted}
              style={{ marginRight: 6 }}
            />
            <Text style={styles.dateTimeText}>
              {dateStr}
              {timeStr ? `  ·  ${timeStr}` : ''}
            </Text>
          </View>

          {/* Vividness */}
          {dream.vividness_score != null && (
            <View style={styles.card}>
              <VividnessBar score={dream.vividness_score} />
            </View>
          )}

          {/* AI Summary */}
          {dream.ai_summary ? (
            <View style={[styles.card, styles.summaryCard]}>
              <View style={styles.summaryAccentBar} />
              <View style={styles.summaryContent}>
                <SectionHeader icon="sparkles-outline" title="AI Summary" />
                <Text style={styles.summaryText}>{dream.ai_summary}</Text>
              </View>
            </View>
          ) : null}

          {/* Full Transcript */}
          <View style={styles.card}>
            <SectionHeader icon="document-text-outline" title="Dream Transcript" />
            {isEditing ? (
              <View style={styles.transcriptEditWrapper}>
                <TextInput
                  ref={transcriptRef}
                  style={styles.transcriptInput}
                  value={editedTranscript}
                  onChangeText={setEditedTranscript}
                  multiline
                  textAlignVertical="top"
                  placeholder="Describe your dream…"
                  placeholderTextColor={COLORS.muted}
                  selectionColor={COLORS.accent}
                />
                <View style={styles.editActions}>
                  <TouchableOpacity
                    onPress={handleCancelEdit}
                    style={styles.cancelEditBtn}
                    activeOpacity={0.8}
                    disabled={saving}
                  >
                    <Text style={styles.cancelEditText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleSaveEdit}
                    activeOpacity={0.8}
                    disabled={saving}
                    style={styles.saveEditBtnWrapper}
                  >
                    <LinearGradient
                      colors={['#7B5EA7', '#C084FC']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.saveEditBtn}
                    >
                      {saving ? (
                        <ActivityIndicator color="#FFF" size="small" />
                      ) : (
                        <Text style={styles.saveEditText}>Save</Text>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <Text style={styles.transcriptText}>
                {dream.transcript ?? 'No transcript available.'}
              </Text>
            )}
          </View>

          {/* Emotions */}
          {emotionTags.length > 0 && (
            <View style={styles.card}>
              <SectionHeader icon="heart-outline" title="Emotions" />
              <View style={styles.chipsWrap}>
                {emotionTags.map((tag) => (
                  <EmotionChip key={tag.id ?? tag.label} tag={tag} />
                ))}
              </View>
            </View>
          )}

          {/* Symbols */}
          {symbolTags.length > 0 && (
            <View style={styles.card}>
              <SectionHeader icon="eye-outline" title="Dream Symbols" />
              <View style={styles.symbolsGrid}>
                {symbolTags.map((tag) => (
                  <SymbolTag key={tag.id ?? tag.label} tag={tag} />
                ))}
              </View>
            </View>
          )}

          {/* Action buttons */}
          {!isEditing && (
            <View style={styles.actionRow}>
              {/* Edit */}
              <TouchableOpacity
                onPress={handleStartEdit}
                style={[styles.actionBtn, styles.actionBtnOutlined]}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Edit dream transcript"
              >
                <Ionicons name="create-outline" size={18} color={COLORS.accent} />
                <Text style={[styles.actionBtnText, { color: COLORS.accent }]}>
                  Edit
                </Text>
              </TouchableOpacity>

              {/* Delete */}
              <TouchableOpacity
                onPress={handleDelete}
                style={[styles.actionBtn, styles.actionBtnDanger]}
                activeOpacity={0.8}
                disabled={deleting}
                accessibilityRole="button"
                accessibilityLabel="Delete dream"
              >
                {deleting ? (
                  <ActivityIndicator color={COLORS.danger} size="small" />
                ) : (
                  <>
                    <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
                    <Text style={[styles.actionBtnText, { color: COLORS.danger }]}>
                      Delete
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Share */}
              <TouchableOpacity
                onPress={handleShare}
                activeOpacity={0.85}
                style={styles.actionBtnShareWrapper}
                accessibilityRole="button"
                accessibilityLabel="Share dream card"
              >
                <LinearGradient
                  colors={['#7B5EA7', '#C084FC']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.actionBtn, styles.actionBtnShare]}
                >
                  <Ionicons name="share-social-outline" size={18} color="#FFF" />
                  <Text style={[styles.actionBtnText, { color: '#FFF' }]}>
                    Share
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}

          {/* Bottom spacer */}
          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// =============================================================================
// Styles
// =============================================================================

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  safeArea: {
    flex: 1,
  },

  // ── Center states (loading / error) ─────────────────────────────────────────
  centerState: {
    flex: 1,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    color: COLORS.muted,
  },
  errorTitle: {
    marginTop: 16,
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  errorBody: {
    fontSize: 14,
    color: COLORS.muted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  backFallback: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  backFallbackText: {
    fontSize: 15,
    color: COLORS.accent,
    fontWeight: '600',
  },

  // ── Top bar ─────────────────────────────────────────────────────────────────
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  topBarBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  topBarTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editBtn: {
    paddingHorizontal: 12,
    width: 'auto',
    backgroundColor: 'rgba(192, 132, 252, 0.15)',
    borderColor: 'rgba(192, 132, 252, 0.3)',
  },
  editBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.accent,
  },

  // ── Scroll content ───────────────────────────────────────────────────────────
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 100 : 80,
  },

  // ── Date / Time ──────────────────────────────────────────────────────────────
  dateTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    paddingHorizontal: 2,
  },
  dateTimeText: {
    fontSize: 15,
    color: COLORS.muted,
    fontWeight: '500',
  },

  // ── Card ─────────────────────────────────────────────────────────────────────
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 2,
  },

  // ── Vividness ────────────────────────────────────────────────────────────────
  vividnessRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  vividnessLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.muted,
    width: 70,
  },
  vividnessDots: {
    flexDirection: 'row',
    gap: 5,
    flex: 1,
  },
  vividnessDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  vividnessDotFilled: {
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 3,
    elevation: 2,
  },
  vividnessDotEmpty: {
    backgroundColor: 'rgba(139, 139, 174, 0.25)',
  },
  vividnessScore: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.accent,
    width: 34,
    textAlign: 'right',
  },

  // ── AI Summary card ──────────────────────────────────────────────────────────
  summaryCard: {
    flexDirection: 'row',
    padding: 0,
    overflow: 'hidden',
  },
  summaryAccentBar: {
    width: 4,
    backgroundColor: COLORS.accent,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  summaryContent: {
    flex: 1,
    padding: 16,
  },
  summaryText: {
    fontSize: 15,
    color: COLORS.text,
    fontStyle: 'italic',
    lineHeight: 24,
    marginTop: 8,
    opacity: 0.9,
  },

  // ── Section header ───────────────────────────────────────────────────────────
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  sectionHeaderText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  // ── Transcript ───────────────────────────────────────────────────────────────
  transcriptText: {
    fontSize: 15,
    color: COLORS.text,
    lineHeight: 24,
    opacity: 0.85,
  },
  transcriptEditWrapper: {
    gap: 12,
  },
  transcriptInput: {
    backgroundColor: COLORS.inputBg,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    color: COLORS.text,
    fontSize: 15,
    lineHeight: 22,
    padding: 12,
    minHeight: 140,
    textAlignVertical: 'top',
  },
  editActions: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'flex-end',
  },
  cancelEditBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(139, 139, 174, 0.35)',
  },
  cancelEditText: {
    fontSize: 14,
    color: COLORS.muted,
    fontWeight: '600',
  },
  saveEditBtnWrapper: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  saveEditBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80,
  },
  saveEditText: {
    fontSize: 14,
    color: '#FFF',
    fontWeight: '700',
  },

  // ── Emotions ─────────────────────────────────────────────────────────────────
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  emotionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  emotionDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  emotionChipLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  emotionChipPct: {
    fontSize: 11,
    fontWeight: '500',
    opacity: 0.8,
  },

  // ── Symbols ──────────────────────────────────────────────────────────────────
  symbolsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  symbolTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(139, 139, 174, 0.35)',
    gap: 6,
  },
  symbolTagLabel: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '500',
  },
  symbolTagPct: {
    fontSize: 11,
    color: COLORS.muted,
  },

  // ── Action buttons ───────────────────────────────────────────────────────────
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
    marginBottom: 4,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 12,
    gap: 6,
  },
  actionBtnOutlined: {
    borderWidth: 1.5,
    borderColor: 'rgba(192, 132, 252, 0.45)',
    backgroundColor: 'rgba(192, 132, 252, 0.08)',
  },
  actionBtnDanger: {
    borderWidth: 1.5,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
  },
  actionBtnShareWrapper: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  actionBtnShare: {
    borderRadius: 12,
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
