import React, { useEffect, useRef, useState } from 'react';
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
} from 'react-native';
import { useRoute, useNavigation, type RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Send, ChevronLeft } from 'lucide-react-native';
import type { Socket } from 'socket.io-client';
import { chatApi } from '../../api/endpoints';
import { getChatSocket } from '../../lib/socket';
import { useAuthStore } from '../../stores/auth';
import { theme } from '../../theme';
import type { Message } from '../../api/types';
import type { AppStackParamList } from '../../navigation/AppStack';

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
  const socketRef = useRef<Socket | null>(null);
  const listRef = useRef<FlatList<Message>>(null);

  const { data: initialMessages, isLoading } = useQuery({
    queryKey: ['messages', conversationId],
    queryFn: () => chatApi.listMessages(conversationId),
  });

  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    if (initialMessages) setMessages(initialMessages);
  }, [initialMessages]);

  // WebSocket setup
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

      socket.on('message:read', () => {
        // Could update read receipts here
      });
    }

    void connect();
    // Mark as read on open
    void chatApi.markRead(conversationId).then(() => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    });

    return () => {
      cancelled = true;
      socketRef.current?.off('message:new');
      socketRef.current?.off('message:read');
    };
  }, [conversationId, queryClient]);

  async function onSend() {
    const content = input.trim();
    if (!content || sending) return;
    setSending(true);
    try {
      // Send via WS for real-time, fallback to REST
      if (socketRef.current?.connected) {
        socketRef.current.emit('message:send', { conversationId, content });
      } else {
        const msg = await chatApi.sendMessage(conversationId, content);
        setMessages((prev) => [...prev, msg]);
      }
      setInput('');
    } finally {
      setSending(false);
    }
  }

  function renderMessage({ item }: { item: Message }) {
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
          <Text style={styles.headerSub} numberOfLines={1}>{jobTitle ?? ''}</Text>
        </View>
      </View>

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
              <Text style={styles.emptyText}>Démarre la conversation 👋</Text>
            </View>
          }
        />
      )}

      <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Écris ton message…"
          placeholderTextColor={theme.colors.textMuted}
          multiline
          maxLength={4000}
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

  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, padding: 8, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: theme.colors.border },
  input: { flex: 1, backgroundColor: theme.colors.bgLight, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10, fontFamily: theme.fonts.medium, fontSize: 14, color: '#111', maxHeight: 100 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { backgroundColor: theme.colors.border },
});
