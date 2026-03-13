import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useAuthStore } from "@/store/authStore";
import { api, BASE_URL } from "@/lib/api";
import { useTheme } from "@/hooks/useTheme";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
}

const SUGGESTIONS = [
  "What should I train today?",
  "I only have 20 minutes — what workout?",
  "I only have dumbbells, what can I do?",
  "My legs are sore, what should I train?",
  "Give me a home workout for fat loss",
  "What are the benefits of walking vs running for me?",
  "How many days a week should I train?",
  "Help me build a weekly plan",
];

export default function CoachChatScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const token = useAuthStore((s) => s.token);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const flatListRef = useRef<FlatList>(null);

  const isWeb = Platform.OS === "web";
  const WEB_TOP = 67;
  const WEB_BOTTOM = 34;

  useEffect(() => {
    loadConversation();
  }, []);

  const loadConversation = async () => {
    try {
      setLoading(true);
      const data = await api.getCoachConversation();
      setConversationId(data.id);
      const mapped: ChatMessage[] = (data.messages || []).map((m: any) => ({
        id: String(m.id),
        role: m.role,
        content: m.content,
      }));
      setMessages(mapped);
    } catch (err) {
      console.error("Failed to load conversation:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    Alert.alert(
      "Clear Chat",
      "This will delete your entire conversation history with the AI Coach.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            try {
              const data = await api.clearCoachConversation();
              setConversationId(data.id);
              setMessages([]);
            } catch (err) {
              Alert.alert("Error", "Failed to clear conversation.");
            }
          },
        },
      ]
    );
  };

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || sending) return;

      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: trimmed,
      };
      const assistantId = `assistant-${Date.now()}`;
      const assistantMsg: ChatMessage = {
        id: assistantId,
        role: "assistant",
        content: "",
        streaming: true,
      };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setInput("");
      setSending(true);

      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);

      try {
        const response = await fetch(`${BASE_URL}/coach/message`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ content: trimmed }),
        });

        if (!response.ok || !response.body) {
          throw new Error("Failed to connect to coach");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const jsonStr = line.slice(6).trim();
            if (!jsonStr) continue;
            try {
              const parsed = JSON.parse(jsonStr);
              if (parsed.content) {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? { ...m, content: m.content + parsed.content }
                      : m
                  )
                );
                setTimeout(() => {
                  flatListRef.current?.scrollToEnd({ animated: false });
                }, 50);
              }
              if (parsed.done) {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId ? { ...m, streaming: false } : m
                  )
                );
              }
            } catch {}
          }
        }
      } catch (err) {
        console.error("Stream error:", err);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content:
                    "Sorry, I'm having trouble connecting right now. Please try again.",
                  streaming: false,
                }
              : m
          )
        );
      } finally {
        setSending(false);
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    },
    [sending, token]
  );

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isUser = item.role === "user";
    return (
      <View
        style={[
          styles.messageRow,
          isUser ? styles.messageRowUser : styles.messageRowAssistant,
        ]}
      >
        {!isUser && (
          <View style={[styles.avatar, { backgroundColor: "#00e676" + "22" }]}>
            <Text style={{ fontSize: 14 }}>🤖</Text>
          </View>
        )}
        <View
          style={[
            styles.bubble,
            isUser
              ? [styles.bubbleUser, { backgroundColor: "#00e676" }]
              : [styles.bubbleAssistant, { backgroundColor: theme.card }],
          ]}
        >
          <Text
            style={[
              styles.bubbleText,
              { color: isUser ? "#000" : theme.text },
            ]}
          >
            {item.content}
            {item.streaming && !item.content && (
              <Text style={{ color: theme.textMuted }}>▍</Text>
            )}
          </Text>
          {item.streaming && item.content ? (
            <Text style={[styles.cursor, { color: theme.textMuted }]}>
              ▍
            </Text>
          ) : null}
        </View>
      </View>
    );
  };

  const styles = makeStyles(theme, isWeb, WEB_TOP, WEB_BOTTOM);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={isWeb ? [] : ["top"]}>
      {isWeb && <View style={{ height: WEB_TOP }} />}

      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerBtn} hitSlop={8}>
          <Feather name="arrow-left" size={22} color={theme.text} />
        </Pressable>
        <View style={styles.headerCenter}>
          <View style={styles.headerDot} />
          <Text style={[styles.headerTitle, { color: theme.text }]}>AI Coach</Text>
        </View>
        <Pressable onPress={handleClear} style={styles.headerBtn} hitSlop={8}>
          <Feather name="trash-2" size={18} color={theme.textMuted} />
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#00e676" size="large" />
          <Text style={[styles.loadingText, { color: theme.textMuted }]}>
            Loading your conversation...
          </Text>
        </View>
      ) : (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
        >
          {messages.length === 0 ? (
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={styles.emptyContainer}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.emptyIcon}>
                <Text style={{ fontSize: 48 }}>🤖</Text>
              </View>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>
                Your AI Fitness Coach
              </Text>
              <Text style={[styles.emptySubtitle, { color: theme.textMuted }]}>
                Ask me anything about training, workouts, or how to reach your goals. I know your history and equipment.
              </Text>
              <Text style={[styles.suggestionsLabel, { color: theme.textMuted }]}>
                Try asking:
              </Text>
              <View style={styles.suggestionsGrid}>
                {SUGGESTIONS.map((s) => (
                  <Pressable
                    key={s}
                    style={({ pressed }) => [
                      styles.suggestionChip,
                      { backgroundColor: theme.card, borderColor: theme.border },
                      pressed && { opacity: 0.7 },
                    ]}
                    onPress={() => sendMessage(s)}
                  >
                    <Text style={[styles.suggestionText, { color: theme.text }]}>
                      {s}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          ) : (
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={(item) => item.id}
              renderItem={renderMessage}
              contentContainerStyle={styles.messagesList}
              onContentSizeChange={() =>
                flatListRef.current?.scrollToEnd({ animated: false })
              }
              keyboardShouldPersistTaps="handled"
            />
          )}

          <View style={[styles.inputBar, { backgroundColor: theme.card, borderTopColor: theme.border }]}>
            <TextInput
              style={[styles.input, { color: theme.text, backgroundColor: theme.background }]}
              placeholder="Ask your coach anything..."
              placeholderTextColor={theme.textMuted}
              value={input}
              onChangeText={setInput}
              multiline
              maxLength={500}
              returnKeyType="send"
              onSubmitEditing={() => sendMessage(input)}
              editable={!sending}
            />
            <Pressable
              style={({ pressed }) => [
                styles.sendBtn,
                { backgroundColor: input.trim() && !sending ? "#00e676" : theme.border },
                pressed && { opacity: 0.8 },
              ]}
              onPress={() => sendMessage(input)}
              disabled={!input.trim() || sending}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#000" />
              ) : (
                <Feather name="send" size={18} color={input.trim() ? "#000" : theme.textMuted} />
              )}
            </Pressable>
          </View>

          {messages.length > 0 && !sending && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.quickChips}
              keyboardShouldPersistTaps="handled"
            >
              {SUGGESTIONS.slice(0, 4).map((s) => (
                <Pressable
                  key={s}
                  style={({ pressed }) => [
                    styles.quickChip,
                    { backgroundColor: theme.card, borderColor: theme.border },
                    pressed && { opacity: 0.7 },
                  ]}
                  onPress={() => sendMessage(s)}
                >
                  <Text style={[styles.quickChipText, { color: theme.textMuted }]}>{s}</Text>
                </Pressable>
              ))}
            </ScrollView>
          )}

          {isWeb && <View style={{ height: WEB_BOTTOM }} />}
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

function makeStyles(theme: any, isWeb: boolean, webTop: number, webBottom: number) {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    headerBtn: {
      width: 36,
      height: 36,
      alignItems: "center",
      justifyContent: "center",
    },
    headerCenter: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
    },
    headerDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: "#00e676",
    },
    headerTitle: {
      fontFamily: "Inter_700Bold",
      fontSize: 17,
    },
    loadingContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 12,
    },
    loadingText: {
      fontFamily: "Inter_400Regular",
      fontSize: 14,
    },
    emptyContainer: {
      flexGrow: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
      paddingBottom: 40,
    },
    emptyIcon: {
      marginBottom: 16,
    },
    emptyTitle: {
      fontFamily: "Inter_700Bold",
      fontSize: 22,
      marginBottom: 8,
      textAlign: "center",
    },
    emptySubtitle: {
      fontFamily: "Inter_400Regular",
      fontSize: 14,
      textAlign: "center",
      lineHeight: 21,
      marginBottom: 28,
      maxWidth: 320,
    },
    suggestionsLabel: {
      fontFamily: "Inter_500Medium",
      fontSize: 13,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginBottom: 12,
      alignSelf: "flex-start",
    },
    suggestionsGrid: {
      width: "100%",
      gap: 8,
    },
    suggestionChip: {
      borderRadius: 12,
      borderWidth: 1,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    suggestionText: {
      fontFamily: "Inter_400Regular",
      fontSize: 14,
      lineHeight: 20,
    },
    messagesList: {
      padding: 16,
      paddingBottom: 8,
      gap: 12,
    },
    messageRow: {
      flexDirection: "row",
      alignItems: "flex-end",
      gap: 8,
      marginBottom: 4,
    },
    messageRowUser: {
      justifyContent: "flex-end",
    },
    messageRowAssistant: {
      justifyContent: "flex-start",
    },
    avatar: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    bubble: {
      maxWidth: "80%",
      borderRadius: 18,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    bubbleUser: {
      borderBottomRightRadius: 4,
    },
    bubbleAssistant: {
      borderBottomLeftRadius: 4,
    },
    bubbleText: {
      fontFamily: "Inter_400Regular",
      fontSize: 15,
      lineHeight: 22,
    },
    cursor: {
      fontFamily: "Inter_400Regular",
      fontSize: 15,
    },
    inputBar: {
      flexDirection: "row",
      alignItems: "flex-end",
      gap: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderTopWidth: 1,
    },
    input: {
      flex: 1,
      borderRadius: 20,
      paddingHorizontal: 16,
      paddingVertical: 10,
      fontFamily: "Inter_400Regular",
      fontSize: 15,
      maxHeight: 120,
      minHeight: 42,
    },
    sendBtn: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    quickChips: {
      paddingHorizontal: 12,
      paddingBottom: 8,
      gap: 8,
    },
    quickChip: {
      borderRadius: 20,
      borderWidth: 1,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    quickChipText: {
      fontFamily: "Inter_400Regular",
      fontSize: 12,
    },
  });
}
