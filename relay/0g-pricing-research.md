# 0G Compute Pricing Research — Huru Cost Basis & Retail Strategy

> Date: May 2026 | 0G Token: $0.49 USD | NGN Rate: ~1,400/$1

## Live Models on 0G Mainnet (SDK Query)

10 models discovered via `broker.inference.listService()`. All providers use **TeeML** (TEE-verified) inference.

| Model | Type | Input (wei/tok) | Output (wei/tok) |
|-------|------|-----------------|------------------|
| qwen/qwen3-vl-30b-a3b-instruct | chatbot | 30,000,000,000 | 380,000,000,000 |
| 0GM-1.0-35B-A3B | chatbot | 320,000,000,000 | 1,940,000,000,000 |
| deepseek/deepseek-chat-v3-0324 | chatbot | 510,000,000,000 | 760,000,000,000 |
| qwen3.6-plus | chatbot | 490,000,000,000 | 2,940,000,000,000 |
| zai-org/GLM-5-FP8 | chatbot | 1,210,000,000,000 | 3,890,000,000,000 |
| zai-org/GLM-5.1-FP8 | chatbot | 1,730,000,000,000 | 5,470,000,000,000 |
| openai/gpt-5.4-mini | chatbot | 1,600,000,000,000 | 9,000,000,000,000 |
| deepseek-v4-pro | chatbot | 2,930,000,000,000 | 5,870,000,000,000 |
| openai/whisper-large-v3 | speech-to-text | 40,000,000,000 | 110,000,000,000 |
| z-image | text-to-image | 0 | 81,054,190,000,000,000 |

---

## USD Pricing per 1M Tokens

| Model | Input/1M | Output/1M | Savings vs Centralized |
|-------|----------|-----------|----------------------|
| qwen/qwen3-vl-30b-a3b | $0.0147 | $0.1862 | — |
| 0GM-1.0-35B-A3B | $0.1568 | $0.9506 | — |
| deepseek/deepseek-chat-v3-0324 | $0.2499 | $0.3724 | ~7% in / ~66% out vs direct |
| qwen3.6-plus | $0.2401 | $1.4406 | — |
| zai-org/GLM-5-FP8 | $0.5929 | $1.9061 | ~41% in / ~40% out vs Together AI |
| zai-org/GLM-5.1-FP8 | $0.8477 | $2.6803 | — |
| openai/gpt-5.4-mini | $0.7840 | $4.4100 | ~74% in / ~63% out vs OpenAI |
| deepseek-v4-pro | $1.4357 | $2.8763 | — |

**Other services:**
- whisper-large-v3: Input $0.0196/1M, Output $0.0539/1M
- z-image: **$0.0397 per image**

---

## Naira Pricing (Your Cost) per 1M Tokens

| Model | Input (NGN) | Output (NGN) | Blended (NGN) |
|-------|-------------|--------------|----------------|
| qwen/qwen3-vl-30b-a3b | 21 | 261 | 201 |
| 0GM-1.0-35B-A3B | 220 | 1,331 | 1,053 |
| deepseek/deepseek-chat-v3-0324 | 350 | 521 | 479 |
| qwen3.6-plus | 336 | 2,017 | 1,597 |
| zai-org/GLM-5-FP8 | 830 | 2,669 | 2,209 |
| zai-org/GLM-5.1-FP8 | 1,187 | 3,752 | 3,111 |
| openai/gpt-5.4-mini | 1,098 | 6,174 | 4,905 |
| deepseek-v4-pro | 2,010 | 4,027 | 3,523 |

> Blended assumes 25% input / 75% output ratio (typical chat).

**Per 1K tokens (what 1 credit roughly equals):**

| Model | Input (NGN) | Output (NGN) | Blended (NGN) |
|-------|-------------|--------------|----------------|
| deepseek-chat-v3 (baseline) | 0.0003 | 0.0005 | 0.0005 |

**Other services in NGN:**
- whisper-large-v3: Input 27.44/1M, Output 75.46/1M
- z-image: **55.56 NGN per image**

---

## Customer Spending Profiles (Monthly)

Based on deepseek-chat-v3 as the routed model.

| Profile | Req/day | Tok/req | Tokens/mo | Your Cost (NGN) | @ 2x | @ 3x |
|---------|---------|---------|-----------|-----------------|------|------|
| Casual Chatter | 5 | 700 | 0.11M | 42 | 84 | 126 |
| Regular User | 15 | 1,200 | 0.54M | 220 | 440 | 660 |
| Power User | 40 | 2,300 | 2.76M | 1,130 | 2,260 | 3,390 |
| Business User | 60 | 3,000 | 5.40M | 2,198 | 4,396 | 6,594 |
| Heavy/API Dev | 200 | 3,700 | 22.20M | 9,002 | 18,004 | 27,006 |

### Per Conversation Cost

| Turns | Input Tokens | Output Tokens | Total | Cost (NGN) |
|-------|-------------|---------------|-------|------------|
| 1 | 700 | 200 | 900 | 0.35 |
| 3 | 1,500 | 600 | 2,100 | 0.87 |
| 5 | 2,500 | 1,000 | 3,500 | 1.44 |
| 10 | 4,500 | 2,000 | 6,500 | 2.67 |
| 20 | 8,000 | 3,000 | 11,000 | 4.36 |

### Speech-to-Text Usage

| Scenario | Tokens | Files/mo | Cost/mo (NGN) |
|----------|--------|----------|---------------|
| Voice note (1 min) | 200 | 1 | 0.01 |
| Meeting (30 min) | 6,000 | 1 | 0.37 |
| Podcast (60 min) | 12,000 | 1 | 0.74 |
| Daily voice notes | 200 | 300 | 3.70 |
| Weekly meetings | 6,000 | 4 | 1.48 |

### Image Generation Usage

Cost per image: **55.56 NGN**

| Scenario | Images | Cost/mo (NGN) | @ 2x retail |
|----------|--------|---------------|-------------|
| Casual (5/mo) | 5 | 278 | 556 |
| Regular (20/mo) | 20 | 1,111 | 2,222 |
| Designer (100/mo) | 100 | 5,556 | 11,112 |
| Heavy (500/mo) | 500 | 27,780 | 55,560 |

---

## Current Huru Credit Packs (as coded)

| Plan | Price (NGN) | Credits | Your Cost to Serve (NGN) | Margin |
|------|-------------|---------|--------------------------|--------|
| Starter | 10 | 100 | 48 | **-380%** |
| Builder | 25 | 300 | 143 | **-472%** |
| Pilot | 100 | 1,400 | 670 | **-570%** |
| Growth | 300 | 5,000 | 2,392 | **-697%** |
| Scale | 1,000 | 25,000 | 11,962 | **-1096%** |

> **All current plans are selling at significant loss.** The cost to serve exceeds the selling price by 4-11x.

---

## Recommended Pricing (3x Markup)

| Plan | Credits | ~Tokens | Your Cost (NGN) | Sell At (NGN) | Profit (NGN) | Target User |
|------|---------|---------|-----------------|---------------|--------------|-------------|
| Free Tier | 50 | 0.1M | 24 | FREE | -24 | Trial, 2-3 days |
| Starter | 500 | 0.5M | 239 | 717 | 478 | Casual, ~2 weeks |
| Basic | 2,000 | 2.0M | 957 | 2,871 | 1,914 | Regular, ~1 month |
| Pro | 8,000 | 8.0M | 3,828 | 11,484 | 7,656 | Power user, ~1 month |
| Business | 25,000 | 25.0M | 11,962 | 35,886 | 23,924 | Business/API, ~1 month |
| Enterprise | 100,000 | 100.0M | 47,848 | 143,544 | 95,696 | High-volume API |

> **Industry standard:** AI SaaS prices at 3-5x underlying API cost.

---

## Monthly Platform Cost Scenarios

Using deepseek-chat-v3 blended cost as baseline.

| Users | Req/day | Tok/req | Tokens/mo | Cost/mo (NGN) | Cost/mo ($) |
|-------|---------|---------|-----------|---------------|-------------|
| 10 | 20 | 2,000 | 12.0M | 5,742 | 4.10 |
| 50 | 30 | 2,000 | 90.0M | 43,065 | 30.76 |
| 100 | 40 | 2,000 | 240.0M | 114,840 | 82.03 |
| 500 | 20 | 2,000 | 600.0M | 287,100 | 205.07 |
| 1,000 | 25 | 2,000 | 1,500.0M | 717,750 | 512.68 |

---

## Key Takeaways

1. **0G is 40-74% cheaper** than centralized providers (OpenAI, Together AI, DeepSeek direct)
2. **deepseek-chat-v3** is the best price/quality ratio for a default model (~$0.25/$0.37 per 1M tokens)
3. **Price at 3-5x cost** for healthy SaaS margins
4. **Current credit packs need repricing** — every pack sells below cost
5. **Image generation** is the most expensive per-unit service (55.56 NGN/image) — consider separate pricing
6. **TEE verification** (Sealed Inference) is included at no extra cost — a differentiator vs centralized APIs
