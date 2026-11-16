import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { Bot, Sparkles, Send, Trash2, ArrowRight } from 'lucide-react';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import { isStoreBusinessQuestion, OUT_OF_SCOPE_REPLY } from '../utils/aiChatScope';
import { buildAiBusinessContext, getLocalBusinessAnswer } from '../utils/aiBusinessContext';
import { readAiApiResponse } from '../utils/readAiApiResponse';

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  fallbackReason?: 'missing-api-key' | 'provider-error';
}

export const AiChatbotView: React.FC = () => {
  const {
    products,
    bales,
    expenseAccounts,
    expenses,
    categories,
    suppliers,
    orders,
    transactions,
    itemStatusLogs,
    customers,
  } = useStore();

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      sender: 'ai',
      text: "Hi! I'm Invexa, your AI business assistant for EXINS Jksur+ Novaliches. I can analyze inventory, sales, categories, orders, suppliers, expenses, transactions, and forecasts using your store data. Customer names and supplier contact details are not sent to the AI.\n\nWhat would you like to know?",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const contextData = useMemo(
    () => buildAiBusinessContext({
      products,
      bales,
      categories,
      suppliers,
      expenseAccounts,
      expenses,
      orders,
      transactions,
      itemStatusLogs,
      customers,
    }),
    [
      products,
      bales,
      categories,
      suppliers,
      expenseAccounts,
      expenses,
      orders,
      transactions,
      itemStatusLogs,
      customers,
    ],
  );

  // Use deterministic local analytics when the AI provider is unavailable.
  const getLiveDatabaseAnswer = (queryText: string): string => {
    const q = queryText.toLowerCase().trim();
    if (
      /\b(sales?|sold|selling|best.?sell|top.?sell|revenue|orders?|transactions?|profit|forecast|predict|next month|suppliers?|bales?|item status|status logs?|lost|damaged|returned|found|categories|category|products?|items?|expenses?|budgets?|spending|spent|disbursements?|recommendations?|suggestions?|advice|strategy|optimize|improve|reduce|cut|save|low stock|out of stock|restock|reorder)\b/.test(q)
    ) {
      return getLocalBusinessAnswer(queryText, contextData);
    }

    const availableProducts = products.filter((p) => (p.availableQuantity || 0) > 0);
    const availableCategoryCount = new Set(availableProducts.map((p) => p.category).filter(Boolean)).size;
    const totalUnits = availableProducts.reduce((sum, p) => sum + (p.availableQuantity || 0), 0);
    const lowStock = availableProducts.filter((p) => p.availableQuantity <= 3);
    const totalExp = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

    // 1. RECOMMENDATIONS & BUSINESS STRATEGY
    if (
      q.includes('recommend') ||
      q.includes('suggestion') ||
      q.includes('advice') ||
      q.includes('strategy') ||
      q.includes('optimize') ||
      q.includes('improve')
    ) {
      let advice = `🎯 **Inventory & Expense Recommendations for EXINS Jksur+ Novaliches**:\n\n`;

      // Restocking recommendation
      if (lowStock.length > 0) {
        const topLow = lowStock.slice(0, 3).map((p) => p.name).join(', ');
        advice += `📦 **1. Urgent Restocking Action**:\n` +
          `• Priority Reorder: ${topLow} (${lowStock.length} available products have 3 or fewer units).\n` +
          `• Recommendation: Order fresh bales for high-turnover apparel to avoid lost sales at the store counter.\n\n`;
      } else {
        advice += `📦 **1. Inventory Health**:\n` +
          `• Stock levels across all ${availableProducts.length} available products are above 3 units.\n\n`;
      }

      advice += `🏷️ **Bale Inventory**:\n` +
        `• ${bales.length} bales are recorded. Review their quantities and purchase costs in Inventory Management.\n\n`;

      // Expense control recommendation
      const overBudgetAccounts = expenseAccounts.filter((a) => (a.totalSpent || 0) > a.monthlyBudget);
      if (overBudgetAccounts.length > 0) {
        const worstAcc = overBudgetAccounts[0];
        advice += `✂️ **3. Immediate Expense Reduction**:\n` +
          `• Alert: **${worstAcc.name}** is currently over budget (₱${(worstAcc.totalSpent || 0).toLocaleString()} spent vs ₱${worstAcc.monthlyBudget.toLocaleString()} allocation).\n` +
          `• Recommendation: Audit recent disbursements in this account, renegotiate supplier or utility rates, and enforce spending approval limits.\n\n`;
      } else {
        advice += `✂️ **3. Expense Control**:\n` +
          `• All ${expenseAccounts.length} expense accounts are within their monthly budgets. Keep maintaining this strict fiscal discipline!\n\n`;
      }

      return advice;
    }

    // 2. EXPENSE REDUCTION & HIGHEST EXPENSE
    if (
      q.includes('reduce') ||
      q.includes('cut') ||
      q.includes('lower') ||
      q.includes('save') ||
      q.includes('highest expense') ||
      q.includes('biggest expense')
    ) {
      if (expenseAccounts.length === 0) {
        return 'No expense accounts have been configured yet. Set them up under "Finance Management" -> "Expense Categories" to track cost reductions.';
      }

      const sortedBySpend = [...expenseAccounts].sort((a, b) => (b.totalSpent || 0) - (a.totalSpent || 0));
      const topExpense = sortedBySpend[0];
      const percentOfTotal = totalExp > 0 ? (((topExpense.totalSpent || 0) / totalExp) * 100).toFixed(1) : '0';

      let reply = `💰 **Direct Answer: Your Highest Expense Category is "${topExpense.name}"**\n` +
        `• Amount Spent: **₱${(topExpense.totalSpent || 0).toLocaleString()}** (${percentOfTotal}% of total disbursements)\n` +
        `• Monthly Budget: ₱${topExpense.monthlyBudget.toLocaleString()} (${(topExpense.totalSpent || 0) > topExpense.monthlyBudget ? '⚠️ OVER BUDGET' : '✅ Within Budget'})\n\n` +
        `💡 **3 Actionable Steps to Reduce Expenses for EXINS Novaliches**:\n` +
        `1. **Cap High-Outflow Categories**: Set a hard daily spending freeze on "${topExpense.name}" disbursements until the end of the billing cycle.\n` +
        `2. **Utilities & Operational Costs**: If power/electricity is high, schedule shop air-conditioning cycles and transition store spotlights to 5W LED bulbs.\n` +
        `3. **Packaging Supplies**: Purchase plastic garment bags and tags in bulk cartons of 1,000+ units rather than retail packs to save 25-35% on packaging cost.`;

      return reply;
    }

    // 3. LOW STOCK & RESTOCKING
    if (q.includes('low stock') || q.includes('out of stock') || q.includes('restock') || q.includes('reorder')) {
      if (lowStock.length === 0) {
        return `✅ **Direct Answer: No available products are below the low-stock threshold.**\nAll ${availableProducts.length} currently available products have more than 3 units.\n\n💡 **Recommendation**: Review stock levels regularly and prepare reorder lists with suppliers when items approach their minimum stock level.`;
      }

      let report = `📦 **Direct Answer: ${lowStock.length} available products have low stock (3 or fewer units)**:\n\n`;
      report += `⚠️ **Low Stock**:\n` +
        lowStock.slice(0, 8).map((p) => `• **${p.name}**: ${p.availableQuantity} pcs left (₱${p.sellingPrice.toLocaleString()})`).join('\n') + `\n\n`;
      report += `💡 **Restocking Recommendation**:\n` +
        `• Reorder fresh bales from suppliers to maintain available inventory before the weekend rush.\n` +
        `• Set safety stock buffers in "Inventory Management" so staff receive alerts when inventory drops below 5 units.`;

      return report;
    }

    // Bale inventory and purchase costs.
    if (q.includes('bale')) {
      if (bales.length === 0) {
        return 'No bales are currently registered in your inventory database. Record new bales under "Inventory Management" -> "Bale Management".';
      }

      let reply = `🏷️ **Direct Answer: ${bales.length} bales are recorded in inventory**\n\n`;
      reply += bales.slice(0, 6).map((b) => {
        return `• **[${b.baleCode}] ${b.baleName}**: Purchase cost ₱${b.totalPurchasePrice.toLocaleString()} | Status: ${b.status}`;
      }).join('\n');

      return reply;
    }

    // 5. EXPENSE & BUDGET STATUS
    if (/\b(?:expense|expenses|budget|budgets|disbursement|disbursements|spending|spent)\b/.test(q)) {
      let reply = `💰 **Direct Answer: Total Recorded Expenses = ₱${totalExp.toLocaleString()} Across ${expenseAccounts.length} Accounts**\n\n`;
      reply += expenseAccounts.slice(0, 6).map((a) => {
        const spent = a.totalSpent || 0;
        const isOver = spent > a.monthlyBudget;
        return `• **${a.name}**: ₱${spent.toLocaleString()} spent / ₱${a.monthlyBudget.toLocaleString()} budget (${
          isOver ? '⚠️ OVER BUDGET' : '✅ Within Budget'
        })`;
      }).join('\n');

      const overBudget = expenseAccounts.filter((a) => (a.totalSpent || 0) > a.monthlyBudget);
      reply += `\n\n💡 **Financial Recommendation**:\n` +
        (overBudget.length > 0
          ? `• ${overBudget.length} account(s) exceed monthly limits. Review disbursements under "Finance Management" -> "Expense Tracker" to halt non-essential purchases.`
          : `• All accounts are within budget. Continue reviewing expense records regularly.`);

      return reply;
    }

    // Default scoped inventory and expense summary.
    return `📊 **Inventory & Expense Summary for EXINS Jksur+ Novaliches**:\n\n` +
      `📦 **Inventory**: ${availableProducts.length} available products listed with ${totalUnits.toLocaleString()} units in stock across ${availableCategoryCount} categories.\n` +
      `⚠️ **Stock Status**: ${lowStock.length} available items low in stock (<= 3 pcs).\n` +
      `🏷️ **Bales**: ${bales.length} total bales.\n` +
      `💰 **Expenses**: ${expenseAccounts.length} budget accounts with ₱${totalExp.toLocaleString()} in recorded disbursements.\n` +
      `Ask about a specific product, stock level, bale, expense account, or budget for details.`;
  };

  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = customPrompt || input;
    if (!textToSend.trim() || loading) return;

    const userMessage: ChatMessage = {
      id: `usr_${Date.now()}`,
      sender: 'user',
      text: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!customPrompt) setInput('');

    if (!isStoreBusinessQuestion(textToSend)) {
      const refusalMsg: ChatMessage = {
        id: `ai_${Date.now()}`,
        sender: 'ai',
        text: OUT_OF_SCOPE_REPLY,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, refusalMsg]);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: textToSend.trim(),
          contextData,
        }),
      });

      const data = await readAiApiResponse(response);
      if (!response.ok) {
        throw new Error(typeof data.error === 'string' ? data.error : 'The assistant request failed.');
      }
      const apiText = typeof data.text === 'string' ? data.text : '';
      const replyText =
        apiText && data.fallback !== true
          ? apiText
          : getLiveDatabaseAnswer(textToSend.trim());
      const fallbackReason = data.fallback === true
        ? data.fallbackReason === 'missing-api-key'
          ? 'missing-api-key'
          : 'provider-error'
        : undefined;

      const aiMessage: ChatMessage = {
        id: `ai_${Date.now()}`,
        sender: 'ai',
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        fallbackReason,
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error('Inventory and expense assistant request failed:', error);
      const errorMsg: ChatMessage = {
        id: `ai_${Date.now()}`,
        sender: 'ai',
        text: getLiveDatabaseAnswer(textToSend.trim()),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        fallbackReason: 'provider-error',
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearChat = () => {
    setIsClearConfirmOpen(true);
  };

  const executeClearChat = () => {
    setMessages([
      {
        id: 'welcome-reset',
        sender: 'ai',
        text: 'Chat history cleared. Ask me about inventory, sales, categories, orders, suppliers, expenses, transactions, forecasts, or stock status.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    setIsClearConfirmOpen(false);
  };

  const quickPrompts = [
    'What are the best-selling categories for next month?',
    'Which categories and products sold the most?',
    'Show monthly sales, revenue, and estimated gross profit',
    'What are your top recommendations to reduce expenses?',
    'Which products need urgent restocking and reordering?',
    'What bale quantities and purchase costs are recorded?',
    'What is my highest expense category and how can I cut it?',
    'How can I improve inventory turnover and control expenses?',
    'Show my inventory and expense summary',
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-4 animate-fade-in pb-16">
      {/* Chatbot Header */}
      <div className="p-6 rounded-3xl glass-panel flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 via-amber-600 to-amber-900 flex items-center justify-center text-white shadow-lg shadow-orange-600/30 border border-orange-400/40">
            <Bot className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-white">Hi, I'm Invexa</h1>
              <span className="px-2.5 py-0.5 rounded-full bg-orange-500/20 text-orange-400 text-[10px] font-bold tracking-widest uppercase border border-orange-500/30">
                Store Business Assistant
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={handleClearChat}
          className="p-2.5 rounded-xl bg-stone-900/80 hover:bg-stone-800 text-stone-400 hover:text-stone-200 border border-stone-800 flex items-center gap-1.5 text-xs transition cursor-pointer self-start sm:self-auto"
          title="Clear Chat Conversation"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Clear Chat</span>
        </button>
      </div>

      {/* Suggested Quick Question Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <span className="text-stone-400 font-semibold flex items-center gap-1 shrink-0 pl-1">
          <Sparkles className="w-3.5 h-3.5 text-orange-400" />
          Smart Inquiries:
        </span>
        {quickPrompts.map((q, idx) => (
          <button
            key={idx}
            onClick={() => handleSendMessage(q)}
            className="px-3.5 py-1.5 rounded-full bg-stone-900/80 hover:bg-stone-800 text-stone-300 hover:text-white border border-orange-500/20 text-xs shrink-0 transition flex items-center gap-1.5 cursor-pointer hover:border-orange-500/50"
          >
            <span>{q}</span>
            <ArrowRight className="w-3 h-3 text-orange-400" />
          </button>
        ))}
      </div>

      {/* Chat Messages Log */}
      <div className="p-6 rounded-3xl glass-panel min-h-[440px] max-h-[580px] overflow-y-auto space-y-4 text-xs sm:text-sm">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex items-start gap-3 ${m.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
          >
            {m.sender === 'ai' ? (
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-500 to-amber-700 flex items-center justify-center text-white shrink-0 mt-0.5 shadow-md">
                <Bot className="w-4 h-4" />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-xl bg-stone-800 flex items-center justify-center text-stone-300 shrink-0 mt-0.5 font-bold font-mono">
                U
              </div>
            )}

            <div className={`max-w-[85%] space-y-1 ${m.sender === 'user' ? 'text-right' : 'text-left'}`}>
              <div
                className={`p-4 rounded-2xl leading-relaxed whitespace-pre-wrap ${
                  m.sender === 'user'
                    ? 'bg-gradient-to-r from-orange-600 to-amber-700 text-white rounded-tr-xs shadow-md'
                    : 'bg-stone-950/80 border border-orange-500/25 text-stone-200 rounded-tl-xs shadow-sm'
                }`}
              >
                {m.text}
              </div>
              {m.fallbackReason && (
                <p className="text-[10px] text-amber-300 px-1">
                  {m.fallbackReason === 'missing-api-key'
                    ? 'Local fallback: the server is missing OPENROUTER_API_KEY.'
                    : 'Local fallback: the OpenRouter request failed; check server logs.'}
                </p>
              )}
              <span className="text-[10px] text-stone-500 px-1 inline-block">{m.timestamp}</span>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-3 text-stone-400 p-2 text-xs">
            <div className="w-7 h-7 rounded-xl bg-orange-600/30 flex items-center justify-center text-orange-400 animate-spin">
              <Bot className="w-4 h-4" />
            </div>
            <span>Invexa is analyzing your store data...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Field */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
        className="p-3.5 rounded-3xl glass-panel flex items-center gap-2 border border-orange-500/30"
      >
        <input
          type="text"
          maxLength={2000}
          placeholder="Ask about sales, categories, stock, orders, suppliers, or expenses..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
          className="flex-1 px-4 py-3 rounded-2xl bg-stone-950/80 border border-orange-500/20 text-stone-100 placeholder:text-stone-500 text-xs sm:text-sm focus:outline-none focus:border-orange-500 transition"
        />

        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="py-3 px-5 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-700 hover:from-orange-500 hover:to-amber-600 text-white font-bold text-xs sm:text-sm shadow-lg shadow-orange-600/30 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          <span>Send</span>
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>

      {/* Confirmation Modal to prevent accidental clearing of chat */}
      <ConfirmDeleteModal
        isOpen={isClearConfirmOpen}
        onClose={() => setIsClearConfirmOpen(false)}
        onConfirm={executeClearChat}
        title="Clear Chat Conversation?"
        message="Are you sure you want to clear your conversation with Invexa? If you clicked this by accident, click Cancel to keep your conversation."
        itemName="Active Chat Session"
        confirmText="Yes, Clear Chat"
        cancelText="Cancel"
      />
    </div>
  );
};
