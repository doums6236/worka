import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useRoute, useNavigation, type RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Send, ChevronLeft, MoreVertical, CalendarPlus, Lock, Unlock } from 'lucide-react-native';
import type { Socket } from 'socket.io-client';
import { chatApi } from '../../api/endpoints';
import { getChatSocket } from '../../lib/socket';
import { useAuthStore } from '../../stores/auth';
import { theme } from '../../theme';
import type { Message, Conversation, AppointmentMetadata } from '../../api/types';
import type { AppStackParamList } from '../../navigation/AppStack';
import { AppointmentCard } from '../../components/AppointmentCard';
import { ProposeAppointmentModal } from '../../components/ProposeAppointmentModal';
import { scheduleAppointmentReminders } from '../../lib/push-notifications';

type Route = RouteProp<AppStackParamList, 'Chat'>;

export function ChatScreen() {
  const route = useRoute<Route>();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  const { conversationId, jobTitle, companyName } = route.params;
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [proposeOpen, setProposeOpen] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const listRef = useRef<FlatList<Message>>(null);

  const { data: conversations } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => chatApi.listConversations(),
  });

  const conversation: Conversation | undefined = useMemo(
    () => conversations?.find((c) => c.id === conversationId),
    [conversations, conversationId],
  );

  const { data: initialMessages, isLoading } = useQuery({
    queryKey: ['messages', conversationId],
    queryFn: () => chatApi.listMessages(conversationId),
  });

  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    if (initialMessages) setMessages(initialMessages);
  }, [initialMessages]);

  useEffect(() => {
    let socket: Socket | null = null;
    let cancelled = false;

    async function connect() {
      socket = await getChatSocket();
      if (cancelled) return;
      socketRef.current = socket;

      socket.emit('conversation:join', { conversationId });

      socket.on('message:new', (msg: Message) => {
        if (msg.conversationId === conversationId) {
          setMessages((prev) => [...prev, msg]);
        }
      });
    }

    void connect();
    void chatApi.markRead(conversationId).then(() => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread'] });
    });

    return () => {
      cancelled = true;
      socketRef.current?.off('message:new');
    };
  }, [conversationId, queryClient]);

  const isRecruiter = user?.role === 'recruiter';
  const isClosed = conversation?.status === 'closed';
  const candidateCanWrite = !isClosed; // candidate blocked when closed; recruiter can always write
  const canWrite = isRecruiter || candidateCanWrite;

  async function onSend() {
    const content = input.trim();
    if (!content || sending || !canWrite) return;
    setSending(true);
    try {
      if (socketRef.current?.connected) {
        socketRef.current.emit('message:send', { conversationId, content });
      } else {
        const msg = await chatApi.sendMessage(conversationId, content);
        setMessages((prev) => [...prev, msg]);
      }
      setInput('');
    } catch (e) {
      Alert.alert("Erreur", e instanceof Error ? e.message : "Impossible d'envoyer");
    } finally {
      setSending(false);
    }
  }

  async function handleProposeAppointment(data: AppointmentMetadata) {
    const msg = await chatApi.proposeAppointment(conversationId, data);
    setMessages((prev) => [...prev, msg]);
  }

  async function handleConfirmAppointment(messageId: string) {
    try {
      const updated = await chatApi.respondAppointment(messageId, 'confirm');
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, metadata: updated.metadata } : m)),
      );
      const meta = updated.metadata as AppointmentMetadata | null;
      if (meta?.datetime) {
        void scheduleAppointmentReminders(
          meta.datetime,
          companyName ?? 'Rendez-vous',
          `${jobTitle ?? ''}${meta.location ? ' · ' + meta.location : ''}`.trim(),
        );
      }
    } catch (e) {
      Alert.alert('Erreur', e instanceof Error ? e.message : 'Action impossible');
    }
  }

  async function handleDeclineAppointment(messageId: string, reason?: string) {
    try {
      const updated = await chatApi.respondAppointment(messageId, 'decline', reason);
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, metadata: updated.metadata } : m)),
      );
    } catch (e) {
      Alert.alert('Erreur', e instanceof Error ? e.message : 'Action impossible');
    }
  }

  async function handleClose() {
    setMenuOpen(false);
    Alert.alert(
      'Fermer la conversation ?',
      "Le candidat ne pourra plus envoyer de messages. Tu pourras la rouvrir plus tard.",
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Fermer',
          style: 'destructive',
          onPress: async () => {
            try {
              await chatApi.closeConversation(conversationId);
              queryClient.invalidateQueries({ queryKey: ['conversations'] });
              const refreshed = await chatApi.listMessages(conversationId);
              setMessages(refreshed);
            } catch (e) {
              Alert.alert('Erreur', e instanceof Error ? e.message : 'Échec');
            }
          },
        },
      ],
    );
  }

  async function handleReopen() {
    setMenuOpen(false);
    try {
      await chatApi.reopenConversation(conversationId);
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      const refreshed = await chatApi.listMessages(conversationId);
      setMessages(refreshed);
    } catch (e) {
      Alert.alert('Erreur', e instanceof Error ? e.message : 'Échec');
    }
  }

  function renderMessage({ item }: { item: Message }) {
    const type = item.type ?? 'text';

    if (type === 'system') {
      return (
        <View style={styles.systemRow}>
          <Text style={styles.systemText}>{item.content}</Text>
        </View>
      );
    }

    if (type === 'appointment_proposal') {
      const meta = (item.metadata as AppointmentMetadata | null) ?? null;
      if (!meta) return null;
      const isFromMe = item.senderId === user?.id;
      return (
        <View style={[styles.cardRow, isFromMe && styles.cardRowMe]}>
          <View style={styles.cardWrap}>
            <AppointmentCard
              meta={meta}
              canRespond={!isFromMe && !isClosed && meta.status === 'pending'}
              onConfirm={() => handleConfirmAppointment(item.id)}
              onDecline={(reason) => handleDeclineAppointment(item.id, reason)}
            />
          </View>
        </View>
      );
    }

    const isMe = item.senderId === user?.id;
    return (
      <View style={[styles.bubbleRow, isMe && styles.bubbleRowMe]}>
        <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
          <Text style={[styles.bubbleText, isMe && { color: '#fff' }]}>{item.content}</Text>
          <Text style={[styles.bubbleTime, isMe && { color: 'rgba(255,255,255,0.7)' }]}>
            {new Date(item.sentAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.root, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <ChevronLeft size={26} color={theme.colors.primary} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 8 }}>
          <Text style={styles.headerName} numberOfLines={1}>{companyName ?? 'Recruteur'}</Text>
          <Text style={styles.headerSub} numberOfLines={1}>
            {jobTitle ?? ''}
            {isClosed ? ' · Fermée' : ''}
          </Text>
        </View>
        {isRecruiter && (
          <TouchableOpacity onPress={() => setMenuOpen((v) => !v)} hitSlop={12}>
            <MoreVertical size={22} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {isRecruiter && menuOpen && (
        <View style={styles.menu}>
          {!isClosed && (
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setMenuOpen(false);
                setProposeOpen(true);
              }}
            >
              <CalendarPlus size={18} color={theme.colors.primary} />
              <Text style={styles.menuText}>Proposer un rendez-vous</Text>
            </TouchableOpacity>
          )}
          {!isClosed ? (
            <TouchableOpacity style={styles.menuItem} onPress={handleClose}>
              <Lock size={18} color={theme.colors.danger} />
              <Text style={[styles.menuText, { color: theme.colors.danger }]}>
                Fermer la conversation
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.menuItem} onPress={handleReopen}>
              <Unlock size={18} color={theme.colors.success} />
              <Text style={[styles.menuText, { color: theme.colors.success }]}>
                Rouvrir la conversation
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          renderItem={renderMessage}
          contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>Démarre la conversation</Text>
            </View>
          }
        />
      )}

      {isClosed && !isRecruiter ? (
        <View style={[styles.closedBanner, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <Lock size={16} color={theme.colors.textSecondary} />
          <Text style={styles.closedText}>
            Conversation fermée par le recruteur
          </Text>
        </View>
      ) : (
        <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, 8) }]}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder={isClosed ? 'Conversation fermée' : 'Écris ton message…'}
            placeholderTextColor={theme.colors.textMuted}
            multiline
            maxLength={4000}
            editable={canWrite}
          />
          <TouchableOpacity
            style={[styles.sendBtn, !input.trim() && styles.sendBtnDisabled]}
            onPress={onSend}
            disabled={!input.trim() || sending}
            activeOpacity={0.85}
          >
            <Send size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      )}

      <ProposeAppointmentModal
        visible={proposeOpen}
        onClose={() => setProposeOpen(false)}
        onSubmit={handleProposeAppointment}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerName: { fontFamily: theme.fonts.bold, fontSize: 15, color: '#111' },
  headerSub: { fontFamily: theme.fonts.medium, fontSize: 11, color: theme.colors.textSecondary, marginTop: 1 },

  menu: {
    position: 'absolute',
    top: 56,
    right: 8,
    zIndex: 50,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 4,
    minWidth: 220,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  menuText: { fontFamily: theme.fonts.semibold, fontSize: 14, color: '#111' },

  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 80 },
  emptyText: { fontFamily: theme.fonts.medium, fontSize: 13, color: theme.colors.textSecondary },

  bubbleRow: { marginVertical: 4, flexDirection: 'row' },
  bubbleRowMe: { justifyContent: 'flex-end' },
  bubble: { maxWidth: '78%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
  bubbleMe: { backgroundColor: theme.colors.primary, borderBottomRightRadius: 4 },
  bubbleOther: { backgroundColor: '#fff', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: theme.colors.border },
  bubbleText: { fontFamily: theme.fonts.medium, fontSize: 14, color: '#111', lineHeight: 19 },
  bubbleTime: { fontFamily: theme.fonts.regular, fontSize: 10, color: theme.colors.textSecondary, marginTop: 4, textAlign: 'right' },

  cardRow: { marginVertical: 4 },
  cardRowMe: { alignItems: 'flex-end' },
  cardWrap: { maxWidth: '92%', minWidth: '70%' },

  systemRow: { alignItems: 'center', marginVertical: 10, paddingHorizontal: 24 },
  systemText: {
    fontFamily: theme.fonts.medium,
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.04)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    overflow: 'hidden',
  },

  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, padding: 8, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: theme.colors.border },
  input: { flex: 1, backgroundColor: theme.colors.bgLight, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10, fontFamily: theme.fonts.medium, fontSize: 14, color: '#111', maxHeight: 100 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { backgroundColor: theme.colors.border },

  closedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 14,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  closedText: {
    fontFamily: theme.fonts.semibold,
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
});
