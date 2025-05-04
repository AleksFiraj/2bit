import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, TextInput, ActivityIndicator, Alert, Platform, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as api from '../utils/api';
import Constants from 'expo-constants';

export default function SugjerimeAIScreen({ route }) {
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState(null);
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [recommendations, setRecommendations] = useState(null);
  const [insights, setInsights] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [showChatbot, setShowChatbot] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    {
      role: 'system',
      content: `You are ONE Albania SME AI assistant. You help users with quick questions regarding monthly plans, discounts, mobile and internet plans. Plans list:\n\n• ONE Business Start – 1500 ALL/month – Unlimited data (FUP 100 GB), 5000 nat. mins/SMS, 6.47 GB roaming WB, 0 intl mins.\n• ONE Business Advance – 2500 ALL/month – Unlimited data (FUP 100 GB), 5000 nat. mins/SMS, 10.26 GB roaming WB, 100 intl mins.\n• ONE Business Pro – 4000 ALL/month – Unlimited data (FUP 100 GB), 5000 nat. mins/SMS, 18.28 GB roaming WB, 200 intl mins.\n• ONE Business Total – 6000 ALL/month – Unlimited data (FUP 100 GB), 5000 nat. mins/SMS, 26.98 GB roaming WB, 300 intl mins.\n\nAnswer accurately. If question requires privileged company data only provide it when user role is admin_it or sales_support. If user is sme_admin, only provide info related to their own company without revealing others.`
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [sending, setSending] = useState(false);
  
  // For now, use a hardcoded line ID, but in a real app, you would get this from the route params or user context
  const lineId = route?.params?.lineId || 1;
  const userRole = route?.params?.role || 'sme_admin';

  // Fetch recommendations from the API
  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await api.analytics.getRecommendations(lineId);
        setRecommendations(response);
        
        // Transform the API response into the format expected by our UI
        // This mapping would change based on the actual API response structure
        if (response) {
          // Convert insights from API to our UI format
          const insightsData = response.insights?.map((insight, index) => ({
            id: index + 1,
            type: 'insight',
            title: `Insight ${index + 1}`,
            description: insight,
            icon: getIconForInsight(insight),
            color: getColorForIndex(index)
          })) || [];
          
          setInsights(insightsData);
          
          // Create suggestions based on recommendations
          const suggestionsData = [
            {
              id: 1,
              type: 'cost',
              title: 'Optimizim i Kostove',
              description: response.optimalProfile || 'Bazuar në përdorimin tuaj, mund të kurseni duke ndryshuar planin.',
              impact: `Kursim i mundshëm: ${response.potentialSavings || 0} L/muaj`,
              confidence: 95,
              action: 'Shiko planet e reja'
            }
          ];
          
          // Add alternative plans as additional suggestions if available
          if (response.alternativePlans && response.alternativePlans.length > 0) {
            response.alternativePlans.forEach((plan, index) => {
              suggestionsData.push({
                id: index + 2, // Starting from 2 as we already have one suggestion
                type: 'plan',
                title: `Plan: ${plan}`,
                description: `Ky plan është rekomanduar bazuar në përdorimin tuaj të të dhënave.`,
                impact: 'Përmirësim i performancës',
                confidence: 85,
                action: 'Shiko detajet'
              });
            });
          }
          
          setSuggestions(suggestionsData);
        }
      } catch (err) {
        console.error('Error fetching recommendations:', err);
        setError('Failed to load recommendations');
      } finally {
        setLoading(false);
      }
    };
    
    fetchRecommendations();
  }, [lineId]);

  // Quick reply suggestions
  const quickReplies = [
    'Cilat janë planet e disponueshme?',
    'Si mund të përfitoj zbritje?',
    'Sa kushton ONE Business Pro?',
    'Sa internet kam në planin tim?',
  ];

  const sendChatMessage = async (overrideMessage) => {
    const messageText = (overrideMessage ?? chatInput).trim();
    if (!messageText) return;
    const newMessages = [...chatMessages, { role: 'user', content: messageText }];
    setChatMessages(newMessages);
    setChatInput('');
    setSending(true);

    // Save user message
    try {
      await fetch((Constants.expoConfig?.extra?.backendUrl || 'http://localhost:3001') + '/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sender: 'user', role: userRole, content: messageText })
      });
    } catch (err) { console.warn('Failed to persist user chat', err); }

    try {
      const apiKey = getApiKey();
      if (!apiKey) {
        Alert.alert('Configuration error', 'OpenAI API key missing');
        setSending(false);
        return;
      }
      
      console.log('Using API key:', apiKey.substring(0, 5) + '...');
      
      console.log('Sending message to OpenAI API...');
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            ...newMessages.slice(0, 1), // keep system message
            { role: 'system', content: `Current user role: ${userRole}. Answer accordingly.` },
            ...newMessages.slice(1)
          ],
          temperature: 0.7
        })
      });
      
      const data = await response.json();
      console.log('Response received', data);
      
      const assistantMsg = data?.choices?.[0]?.message;
      if (assistantMsg) {
        setChatMessages(prev => [...prev, assistantMsg]);
        // save assistant msg
        try {
          await fetch((Constants.expoConfig?.extra?.backendUrl || 'http://localhost:3001') + '/chat/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sender: 'assistant', role: userRole, content: assistantMsg.content })
          });
        } catch (err) { console.warn('Failed to persist assistant chat', err); }
      } else {
        console.warn('OpenAI response missing message', data);
        Alert.alert('AI Error', 'No response from AI');
      }
    } catch (err) {
      console.error('Chatbot error:', err);
      Alert.alert('AI Error', err.message);
    } finally {
      setSending(false);
    }
  };

  // Helper to safely fetch API key regardless of Expo SDK version
  const getApiKey = () => {
    // Expo SDK 48+: Constants.expoConfig
    if (Constants?.expoConfig?.extra?.openaiApiKey) return Constants.expoConfig.extra.openaiApiKey;
    // Older SDKs (development)
    if (Constants?.manifest?.extra?.openaiApiKey) return Constants.manifest.extra.openaiApiKey;
    // Fallback to env (won't usually work in RN)
    return process.env.OPENAI_API_KEY;
  };

  // Helper functions for UI display
  const getIconForInsight = (insight) => {
    if (insight.toLowerCase().includes('exceed')) return 'trending-up-outline';
    if (insight.toLowerCase().includes('limit')) return 'alert-circle-outline';
    if (insight.toLowerCase().includes('rare')) return 'bulb-outline';
    return 'information-circle-outline';
  };
  
  const getColorForIndex = (index) => {
    const colors = ['#34C759', '#FF9500', '#007AFF', '#5856D6', '#FF2D55'];
    return colors[index % colors.length];
  };
  
  // Handle feedback submission
  const handleFeedbackSubmit = async (isPositive) => {
    try {
      // In a real app, you would send the feedback to your API
      console.log('Submitting feedback:', {
        suggestionId: selectedSuggestion?.id,
        isPositive,
        feedback,
        lineId
      });
      
      // For now, just show an alert
      Alert.alert(
        'Feedback Submitted',
        'Thank you for your feedback!',
        [{ text: 'OK', onPress: () => setShowFeedbackModal(false) }]
      );
      
      // Clear the feedback
      setFeedback('');
    } catch (err) {
      console.error('Error submitting feedback:', err);
      Alert.alert('Error', 'Failed to submit feedback. Please try again.');
    }
  };
  
  // Original static suggestions kept for reference
  /*const suggestions = [
    {
      id: 1,
      type: 'cost',
      title: 'Optimizim i Kostove',
      description: 'Bazuar në përdorimin tuaj, mund të kurseni deri në 20% duke ndryshuar në planin e ri të data.',
      impact: 'Kursim i mundshëm: 500 L/muaj',
      confidence: 95,
      action: 'Shiko planet e reja'
    },
    {
      id: 2,
      type: 'usage',
      title: 'Përdorim Optimal',
      description: 'Përdorimi i data është më i lartë gjatë orëve të pikut. Konsideroni të shpërndani përdorimin.',
      impact: 'Përmirësim i performancës: 15%',
      confidence: 85,
      action: 'Shiko oraret e pikut'
    },
    {
      id: 3,
      type: 'service',
      title: 'Sherbime të Reja',
      description: 'Bazuar në përdorimin tuaj, mund të përfitoni nga paketa e re e SMS Marketing.',
      impact: 'Rritje e efikasitetit: 30%',
      confidence: 90,
      action: 'Shiko detajet'
    }
  ];*/
  
  // Original static insights kept for reference
  /*const insights = [
    {
      id: 1,
      type: 'trend',
      title: 'Trendi i Përdorimit',
      description: 'Përdorimi i data po rritet me 10% çdo muaj. Kjo mund të çojë në kosto shtesë.',
      icon: 'trending-up-outline',
      color: '#34C759'
    },
    {
      id: 2,
      type: 'alert',
      title: 'Paralajmërim i Kostos',
      description: 'Shpenzimet janë 80% të limitit të buxhetit. Konsideroni të rishikoni përdorimin.',
      icon: 'alert-circle-outline',
      color: '#FF9500'
    },
    {
      id: 3,
      type: 'opportunity',
      title: 'Mundësi për Kursime',
      description: '3 linja të paktë të përdorura mund të kombinohen për kursime.',
      icon: 'bulb-outline',
      color: '#007AFF'
    }
  ];*/
  
  // If there's an error, show an error message
  if (error) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity 
          style={styles.retryButton} 
          onPress={() => {
            setLoading(true);
            api.analytics.getRecommendations(lineId)
              .then(response => {
                setRecommendations(response);
                setError(null);
              })
              .catch(err => {
                console.error('Error retrying recommendations fetch:', err);
                setError('Failed to load recommendations');
              })
              .finally(() => setLoading(false));
          }}
        >
          <Text style={styles.retryText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const renderSuggestionCard = (suggestion) => (
    <View style={styles.card} key={suggestion.id}>
      <View style={styles.cardHeader}>
        <View style={styles.suggestionInfo}>
          <Text style={styles.suggestionTitle}>{suggestion.title}</Text>
          <View style={styles.confidenceBadge}>
            <Text style={styles.confidenceText}>{suggestion.confidence}%</Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={() => {
            setSelectedSuggestion(suggestion);
            setShowFeedbackModal(true);
          }}
        >
          <Ionicons name="thumbs-up-outline" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>
      <Text style={styles.suggestionDescription}>{suggestion.description}</Text>
      <View style={styles.suggestionDetails}>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Ndikimi</Text>
          <Text style={styles.detailValue}>{suggestion.impact}</Text>
        </View>
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionText}>{suggestion.action}</Text>
          <Ionicons name="chevron-forward" size={16} color="#007AFF" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderInsightCard = (insight) => (
    <View style={styles.card} key={insight.id}>
      <View style={styles.cardHeader}>
        <View style={styles.insightInfo}>
          <Ionicons name={insight.icon} size={24} color={insight.color} />
          <Text style={styles.insightTitle}>{insight.title}</Text>
        </View>
      </View>
      <Text style={styles.insightDescription}>{insight.description}</Text>
    </View>
  );

  const renderFeedbackModal = () => (
    <Modal
      visible={showFeedbackModal}
      animationType="slide"
      transparent={true}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Jepni Feedback</Text>
            <TouchableOpacity onPress={() => setShowFeedbackModal(false)}>
              <Ionicons name="close" size={24} color="#1C1C1E" />
            </TouchableOpacity>
          </View>
          <View style={styles.modalBody}>
            <Text style={styles.modalDescription}>
              Si e vlerësoni këtë sugjerim?
            </Text>
            <View style={styles.feedbackButtons}>
              <TouchableOpacity
                style={[styles.feedbackButton, styles.positiveButton]}
                onPress={() => handleFeedbackSubmit(true)}
              >
                <Ionicons name="thumbs-up" size={24} color="#fff" />
                <Text style={styles.feedbackButtonText}>E Mirë</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.feedbackButton, styles.negativeButton]}
                onPress={() => handleFeedbackSubmit(false)}
              >
                <Ionicons name="thumbs-down" size={24} color="#fff" />
                <Text style={styles.feedbackButtonText}>Jo E Mirë</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.feedbackInputContainer}>
              <Text style={styles.feedbackLabel}>Koment (opsionale)</Text>
              <TextInput
                style={styles.feedbackInput}
                value={feedback}
                onChangeText={setFeedback}
                placeholder="Shkruani komentin tuaj këtu..."
                multiline
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
  
  // If loading, show a spinner
  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading recommendations...</Text>
      </View>
    );
  }
  
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Sugjerime AI</Text>
        <Text style={styles.subtitle}>Optimizo përdorimin e shërbimeve tuaja me AI.</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sugjerime</Text>
        {suggestions.length > 0 ? (
          suggestions.map(renderSuggestionCard)
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="information-circle-outline" size={48} color="#8E8E93" />
            <Text style={styles.emptyStateText}>No suggestions available at this time.</Text>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Njohuri & Trende</Text>
        {insights.length > 0 ? (
          insights.map(renderInsightCard)
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="analytics-outline" size={48} color="#8E8E93" />
            <Text style={styles.emptyStateText}>No insights available at this time.</Text>
          </View>
        )}
      </View>

      {renderFeedbackModal()}
      
      {/* Chatbot floating button */}
      <TouchableOpacity
        style={styles.chatbotButton}
        onPress={() => setShowChatbot(true)}
      >
        <Ionicons name="chatbox-ellipses" size={28} color="#fff" />
      </TouchableOpacity>
      
      {/* Chatbot Modal */}
      <Modal
        visible={showChatbot}
        animationType="slide"
        onRequestClose={() => setShowChatbot(false)}
      >
        <View style={styles.chatContainer}>
          <View style={styles.chatHeader}>
            <Text style={styles.chatTitle}>ONE Assistant</Text>
            <TouchableOpacity onPress={() => setShowChatbot(false)}>
              <Ionicons name="close" size={24} color="#000" />
            </TouchableOpacity>
          </View>
          <ScrollView
            style={styles.chatMessages}
            contentContainerStyle={{ padding: 12 }}
          >
            {chatMessages.filter(m => m.role !== 'system').map((msg, idx) => (
              <View key={idx} style={[styles.chatBubble, msg.role === 'user' ? styles.userBubble : styles.aiBubble]}>
                <Text style={styles.chatText}>{msg.content}</Text>
              </View>
            ))}
            {sending && <ActivityIndicator style={{ marginVertical: 8 }} />}
          </ScrollView>

          {/* Quick reply chips */}
          <View style={styles.quickRepliesContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {quickReplies.map((msg, idx) => (
                <TouchableOpacity key={idx} style={styles.quickReply} onPress={() => sendChatMessage(msg)}>
                  <Text style={styles.quickReplyText}>{msg}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.chatInputRow}>
            <TextInput
              style={styles.chatInput}
              value={chatInput}
              onChangeText={setChatInput}
              placeholder="Type your message..."
            />
            <TouchableOpacity style={styles.sendButton} onPress={sendChatMessage} disabled={sending}>
              <Ionicons name="send" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
    marginBottom: 16,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 16,
  },
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8',
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : StatusBar.currentHeight + 30,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#1C1C1E',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 16,
    color: '#8E8E93',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  suggestionInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  suggestionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginRight: 12,
  },
  confidenceBadge: {
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  confidenceText: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
  },
  suggestionDescription: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 16,
  },
  suggestionDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    paddingTop: 16,
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    color: '#1C1C1E',
    fontWeight: '500',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  actionText: {
    fontSize: 14,
    color: '#007AFF',
    marginRight: 4,
  },
  insightInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  insightTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginLeft: 12,
  },
  insightDescription: {
    fontSize: 14,
    color: '#8E8E93',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1C1C1E',
  },
  modalBody: {
    marginBottom: 20,
  },
  modalDescription: {
    fontSize: 16,
    color: '#8E8E93',
    marginBottom: 20,
  },
  feedbackButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  feedbackButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    marginHorizontal: 8,
  },
  positiveButton: {
    backgroundColor: '#34C759',
  },
  negativeButton: {
    backgroundColor: '#FF3B30',
  },
  feedbackButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  feedbackInputContainer: {
    marginTop: 20,
  },
  feedbackLabel: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 8,
  },
  feedbackInput: {
    height: 100,
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    textAlignVertical: 'top',
  },
  chatbotButton: {
    position: 'absolute',
    bottom: 1,
    right: 20,
    backgroundColor: '#007AFF',
    borderRadius: 30,
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  chatContainer: { flex: 1, backgroundColor: '#f9f9f9' },
  chatHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  chatTitle: { fontSize: 18, fontWeight: 'bold' },
  chatMessages: { flex: 1 },
  chatBubble: { padding: 10, borderRadius: 8, marginVertical: 4, maxWidth: '80%' },
  userBubble: { backgroundColor: '#007AFF', alignSelf: 'flex-end' },
  aiBubble: { backgroundColor: '#E5E5EA', alignSelf: 'flex-start' },
  chatText: { color: '#000' },
  chatInputRow: { flexDirection: 'row', padding: 8, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#eee' },
  chatInput: { flex: 1, borderWidth: 1, borderColor: '#ccc', borderRadius: 20, paddingHorizontal: 12, height: 40 },
  sendButton: { backgroundColor: '#007AFF', borderRadius: 20, padding: 10, marginLeft: 6, justifyContent: 'center', alignItems: 'center' },
  quickRepliesContainer: { paddingVertical: 6, paddingHorizontal: 8, borderTopWidth: 1, borderTopColor: '#eee', backgroundColor: '#fafafa' },
  quickReply: { backgroundColor: '#E5F0FF', borderRadius: 16, paddingVertical: 6, paddingHorizontal: 12, marginRight: 8 },
  quickReplyText: { color: '#007AFF', fontWeight: '600' },
});
