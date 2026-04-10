import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { FlashList, type FlashListRef } from "@shopify/flash-list";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@/store/authStore";
import { api, BASE_URL } from "@/lib/api";
import { useTheme } from "@/hooks/useTheme";
import { rtlIcon } from "@/lib/rtl";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
  failed?: boolean;
  retryText?: string;
}

function cleanMarkdown(text: string): string {
  let out = text;
  out = out.replace(/```[\s\S]*?```/g, (m) => {
    const inner = m.replace(/^```[^\n]*\n?/, "").replace(/\n?```$/, "");
    return inner;
  });
  out = out.replace(/^\s*\*{3,}\s*$/gm, "");
  out = out.replace(/\*\*(.+?)\*\*/g, "$1");
  out = out.replace(/(^|[\s(])\*([^*\n]+)\*([\s).,!?]|$)/gm, "$1$2$3");
  out = out.replace(/^#{1,6}\s+/gm, "");
  out = out.replace(/`([^`]+)`/g, "$1");
  out = out.replace(/^\s*[\*\-]\s+/gm, "• ");
  out = out.replace(/\n{3,}/g, "\n\n");
  return out.trim();
}

function ThinkingDots({ color }: { color: string }) {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
        ])
      );
    const a1 = animate(dot1, 0);
    const a2 = animate(dot2, 200);
    const a3 = animate(dot3, 400);
    a1.start();
    a2.start();
    a3.start();
    return () => { a1.stop(); a2.stop(); a3.stop(); };
  }, []);

  const dotStyle = (anim: Animated.Value) => ({
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: color,
    marginHorizontal: 2,
    opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }),
    transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.3] }) }],
  });

  return (
    <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: 4 }}>
      <Animated.View style={dotStyle(dot1)} />
      <Animated.View style={dotStyle(dot2)} />
      <Animated.View style={dotStyle(dot3)} />
    </View>
  );
}

export default function CoachChatScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const token = useAuthStore((s) => s.token);
  const { prompt } = useLocalSearchParams<{ prompt?: string }>();
  const promptSentRef = useRef(false);
  const hasAutoSent = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const activeRequestIdRef = useRef<number>(0);

  const suggestions = [
    t("home.coachChip1"),
    t("home.coachChip2"),
    t("home.coachChipRecovery"),
    t("home.coachChipRest"),
  ];

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [sending, setSending] = useState(false);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [proactiveMessage, setProactiveMessage] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [dailyLimit, setDailyLimit] = useState<number | null>(null);
  const flatListRef = useRef<FlashListRef<ChatMessage>>(null);

  const isWeb = Platform.OS === "web";
  const WEB_TOP = 67;
  const WEB_BOTTOM = 34;

  // Abort in-flight request on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    loadConversation();
  }, []);

  useEffect(() => {
    if (prompt && !loading && !promptSentRef.current) {
      promptSentRef.current = true;
      const promptText = Array.isArray(prompt) ? prompt[0] : prompt;
      if (promptText) {
        if (messages.length === 0) {
          sendMessage(promptText);
        } else {
          setInput(promptText);
        }
      }
    }
  }, [prompt, loading]);

  // Fire a single proactive opening message when the conversation is empty —
  // guarded by hasAutoSent so it never re-fires on re-mount or re-render.
  useEffect(() => {
    if (!loading && !loadError && messages.length === 0 && !hasAutoSent.current && !prompt) {
      hasAutoSent.current = true;
      sendProactiveMessage();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, loadError]);

  const loadConversation = async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setLoadError(false);
      const data = await api.getCoachConversation();
      setConversationId(data.id);
      const mapped: ChatMessage[] = (data.messages || []).map((m: any) => ({
        id: String(m.id),
        role: m.role,
        content: m.content,
      }));
      setMessages(mapped);
    } catch (err: any) {
      const msg: string = err?.message ?? "";
      if (msg.includes("401") || msg.includes("not authenticated") || msg.includes("Unauthorized")) {
        // Not logged in — silently show empty chat
        setLoading(false);
        return;
      }
      console.warn("Failed to load conversation:", msg);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  const sendProactiveMessage = useCallback(async () => {
    const assistantId = `assistant-proactive-${Date.now()}`;
    const placeholder: ChatMessage = { id: assistantId, role: "assistant", content: "", streaming: true };
    setMessages([placeholder]);

    try {
      const proactiveController = new AbortController();
      const proactiveTimeout = setTimeout(() => proactiveController.abort(), 20000);
      const response = await fetch(`${BASE_URL}/coach/proactive`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({}),
        signal: proactiveController.signal,
      }).finally(() => clearTimeout(proactiveTimeout));

      if (response.status === 204) {
        // Conversation has messages already — load them fresh
        setMessages([]);
        loadConversation();
        return;
      }

      if (!response.ok) {
        let errorMsg = "Failed to get proactive message";
        try {
          const errData = await response.json();
          if (errData?.error) errorMsg = errData.error;
        } catch {}
        throw new Error(errorMsg);
      }

      const data = await response.json();
      const fullContent: string = data.content || "";

      const words = fullContent.split(" ");
      let current = "";
      for (let i = 0; i < words.length; i++) {
        current += (i === 0 ? "" : " ") + words[i];
        setMessages([{ id: assistantId, role: "assistant", content: current, streaming: true }]);
        if (i % 5 === 4) flatListRef.current?.scrollToEnd({ animated: false });
        await new Promise<void>((r) => setTimeout(r, 20));
      }

      setMessages([{ id: assistantId, role: "assistant", content: fullContent, streaming: false }]);
      setProactiveMessage(fullContent);
    } catch (err: any) {
      console.warn("Proactive message unavailable:", err?.message);
      setMessages([]);
    }
  }, [token]);

  const handleClear = () => {
    Alert.alert(
      t("coach.clearChat"),
      t("coach.clearChatMessage"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("coach.clear"),
          style: "destructive",
          onPress: async () => {
            try {
              const data = await api.clearCoachConversation();
              setConversationId(data.id);
              setMessages([]);
              setProactiveMessage(null);
            } catch (err) {
              Alert.alert(t("common.error"), t("coach.errorClearing"));
            }
          },
        },
      ]
    );
  };

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      // Abort any previous in-flight request
      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      // Track this request so the finally block doesn't race with a newer one
      const requestId = ++activeRequestIdRef.current;

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
      setProactiveMessage(null);
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
          signal: controller.signal,
        });

        if (!response.ok) {
          let errorMsg = t("coach.connectionError");
          try {
            const errData = await response.json();
            if (errData?.error) {
              errorMsg = errData.error;
            } else if (response.status === 503) {
              errorMsg = "AI service temporarily unavailable";
            }
            if (errData?.limitReached) {
              setRemaining(0);
              setDailyLimit(errData.limit ?? null);
            }
          } catch {
            if (response.status === 503) {
              errorMsg = "AI service temporarily unavailable";
            }
          }
          throw new Error(errorMsg);
        }

        const data = await response.json();
        if (data.remaining != null) setRemaining(data.remaining);
        if (data.limit != null) setDailyLimit(data.limit);
        const fullContent: string = data.content || "";

        // Animate the response word by word for a natural feel
        const words = fullContent.split(" ");
        let current = "";
        for (let i = 0; i < words.length; i++) {
          if (controller.signal.aborted) break;
          current += (i === 0 ? "" : " ") + words[i];
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: current } : m
            )
          );
          if (i % 5 === 4) {
            flatListRef.current?.scrollToEnd({ animated: false });
          }
          await new Promise<void>((r) => setTimeout(r, 20));
        }
      } catch (err: any) {
        if (err?.name === "AbortError") {
          // Remove empty placeholder if aborted before any content arrived
          setMessages((prev) =>
            prev.filter((m) => !(m.id === assistantId && m.content === ""))
          );
        } else {
          console.error("Coach error:", err);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, content: err?.message || t("coach.connectionError"), streaming: false, failed: true, retryText: trimmed }
                : m
            )
          );
        }
      } finally {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, streaming: false } : m
          )
        );
        if (activeRequestIdRef.current === requestId) {
          setSending(false);
        }
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    },
    [token]
  );

  const renderMessageContent = (item: ChatMessage, isUser: boolean, textColor: string) => {
    if (isUser) {
      return (
        <Text style={[styles.bubbleText, { color: textColor }]}>
          {item.content}
        </Text>
      );
    }

    if (item.streaming && !item.content) {
      return <ThinkingDots color={textColor} />;
    }

    const cleaned = cleanMarkdown(item.content);

    // Split on blank lines first, then on single newlines within blocks
    const paragraphs = cleaned
      .split(/\n\n+/)
      .flatMap((block) => block.split("\n"))
      .filter((p) => p.trim().length > 0);

    return (
      <View>
        {paragraphs.map((para, i) => (
          <Text
            key={i}
            style={[
              styles.bubbleText,
              { color: textColor },
              i < paragraphs.length - 1 && { marginBottom: 6 },
            ]}
          >
            {para}
          </Text>
        ))}
        {item.streaming && (
          <Text style={[styles.cursor, { color: textColor }]}>▍</Text>
        )}
      </View>
    );
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isUser = item.role === "user";
    const textColor = isUser ? "#000" : theme.text;
    return (
      <View
        style={[
          styles.messageRow,
          isUser ? styles.messageRowUser : styles.messageRowAssistant,
        ]}
      >
        {!isUser && (
          <View style={[styles.avatar, { backgroundColor: theme.primaryDim }]}>
            <Text style={{ fontSize: 14 }}>🤖</Text>
          </View>
        )}
        <View
          style={[
            styles.bubble,
            isUser
              ? [styles.bubbleUser, { backgroundColor: theme.primary }]
              : [styles.bubbleAssistant, { backgroundColor: item.failed ? theme.danger + "18" : theme.card, borderColor: item.failed ? theme.danger + "40" : "transparent", borderWidth: item.failed ? 1 : 0 }],
          ]}
        >
          {renderMessageContent(item, isUser, textColor)}
          {item.failed && item.retryText && (
            <Pressable
              onPress={() => {
                setMessages(prev => prev.filter(m => m.id !== item.id));
                sendMessage(item.retryText!);
              }}
              style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 8, alignSelf: "flex-start" }}
            >
              <Feather name="refresh-cw" size={12} color={theme.primary} />
              <Text style={{ color: theme.primary, fontFamily: "Inter_500Medium", fontSize: 12 }}>{t("common.retry")}</Text>
            </Pressable>
          )}
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
          <Feather name={rtlIcon("arrow-left")} size={22} color={theme.text} />
        </Pressable>
        <View style={styles.headerCenter}>
          <View style={styles.headerDot} />
          <Text style={[styles.headerTitle, { color: theme.text }]}>{t("coach.aiCoach")}</Text>
        </View>
        <Pressable onPress={handleClear} style={styles.headerBtn} hitSlop={8}>
          <Feather name="trash-2" size={18} color={theme.textMuted} />
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <View style={{ width: "100%", gap: 12, paddingHorizontal: 16 }}>
            {[80, 55, 70].map((w, i) => (
              <View key={i} style={{ flexDirection: i % 2 === 0 ? "row" : "row-reverse", gap: 10, alignItems: "flex-end" }}>
                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: theme.card }} />
                <View style={{ width: `${w}%`, height: 52, borderRadius: 14, backgroundColor: theme.card }} />
              </View>
            ))}
          </View>
          <Text style={[styles.loadingText, { color: theme.textMuted, marginTop: 20 }]}>
            {t("coach.loadingConversation")}
          </Text>
        </View>
      ) : loadError ? (
        <View style={styles.loadingContainer}>
          <Feather name="wifi-off" size={40} color={theme.textMuted} />
          <Text style={[styles.loadingText, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
            {t("common.networkError")}
          </Text>
          <Pressable
            onPress={loadConversation}
            style={{ paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, backgroundColor: theme.primary, marginTop: 4 }}
          >
            <Text style={{ color: "#0f0f1a", fontFamily: "Inter_600SemiBold", fontSize: 15 }}>
              {t("common.retry")}
            </Text>
          </Pressable>
        </View>
      ) : (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
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
                {t("coach.yourAICoach")}
              </Text>
              <Text style={[styles.emptySubtitle, { color: theme.textMuted }]}>
                {t("coach.coachDescription")}
              </Text>
              <Text style={[styles.suggestionsLabel, { color: theme.textMuted }]}>
                {t("coach.tryAsking")}
              </Text>
              <View style={styles.suggestionsGrid}>
                {suggestions.map((s, i) => (
                  <Pressable
                    key={i}
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
            <>
              {proactiveMessage && (
                <View
                  style={{
                    margin: 16,
                    marginBottom: 8,
                    padding: 12,
                    backgroundColor: theme.card,
                    borderRadius: 12,
                    borderStartWidth: 3,
                    borderStartColor: theme.primary,
                  }}
                >
                  <Text style={{ fontSize: 11, color: theme.primary, fontFamily: "Inter_600SemiBold", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>
                    {t("coach.todaysBrief") || "TODAY'S BRIEF"}
                  </Text>
                  <Text style={{ fontSize: 14, color: theme.text, lineHeight: 20, fontFamily: "Inter_400Regular" }}>
                    {proactiveMessage}
                  </Text>
                </View>
              )}
              <FlashList
                ref={flatListRef}
                data={proactiveMessage ? messages.filter((m) => !m.id.startsWith("assistant-proactive-")) : messages}
                keyExtractor={(item) => item.id}
                renderItem={renderMessage}
                contentContainerStyle={styles.messagesList}
                onContentSizeChange={() =>
                  flatListRef.current?.scrollToEnd({ animated: false })
                }
                keyboardShouldPersistTaps="handled"
              />
            </>
          )}

          {remaining !== null && dailyLimit !== null && (
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 4, gap: 4 }}>
              <Feather name="zap" size={11} color={remaining === 0 ? theme.danger || "#ef5350" : theme.textMuted} />
              <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: remaining === 0 ? theme.danger || "#ef5350" : theme.textMuted }}>
                {remaining === 0
                  ? t("coach.limitReached")
                  : t("coach.messagesRemaining", { remaining, limit: dailyLimit })}
              </Text>
            </View>
          )}
          <View style={[styles.inputBar, { backgroundColor: theme.card, borderTopColor: theme.border }]}>
            <TextInput
              style={[styles.input, { color: theme.text, backgroundColor: theme.background }]}
              placeholder={remaining === 0 ? t("coach.limitReachedShort") : t("coach.askPlaceholder")}
              placeholderTextColor={theme.textMuted}
              value={input}
              onChangeText={setInput}
              multiline
              maxLength={500}
              returnKeyType="send"
              onSubmitEditing={() => sendMessage(input)}
              editable={remaining !== 0}
            />
            <Pressable
              style={({ pressed }) => [
                styles.sendBtn,
                { backgroundColor: input.trim() && remaining !== 0 ? theme.primary : theme.border },
                pressed && { opacity: 0.8 },
              ]}
              onPress={() => sendMessage(input)}
              disabled={!input.trim() || remaining === 0}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#000" />
              ) : (
                <Feather name="send" size={18} color={input.trim() && remaining !== 0 ? "#000" : theme.textMuted} />
              )}
            </Pressable>
          </View>

          {isWeb ? (
            <View style={{ height: WEB_BOTTOM }} />
          ) : (
            <View style={{ height: insets.bottom + 60 }} />
          )}
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
      backgroundColor: theme.primary,
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
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    suggestionChip: {
      width: "48%",
      borderRadius: 12,
      borderWidth: 1,
      paddingHorizontal: 14,
      paddingVertical: 12,
      minHeight: 52,
      justifyContent: "center",
    },
    suggestionText: {
      fontFamily: "Inter_500Medium",
      fontSize: 13,
      lineHeight: 18,
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
  });
}
