# Grill: Large Language Models

- Date: 2026-11-23 · Questions: 7 · Pitch level: **Intermediate**

## Concepts
| Concept | Tag | Evidence |
|---|---|---|
| Next-token prediction | solid | Q1 right (recognise), confident: knows the output is a distribution over the vocab |
| Tokenization | unknown | not reached (cautious default) |
| Token embeddings | unknown | not reached (cautious default) |
| Positional information | unknown | not reached (cautious default) |
| Self-attention: Q, K, V | shaky | Q2 right (apply: N x N shape), Q4 right (why sqrt(d_k)); Q7 explain only partly right: missed the weighted blend of values and said "surrounding" tokens |
| Causal masking | solid | Q3 right (-inf, softmax gives 0); but Q7 wording ("surrounding context") suggests the bidirectional picture still slips in when explaining |
| Multi-head attention | unknown | not reached (cautious default) |
| Transformer block and residual stream | unknown | not reached (cautious default) |
| LM head and softmax | shaky | Q1 right (recognise), but Q6 shows they don't see softmax as a function of the logits that temperature reshapes |
| Training objective | unknown | not reached (cautious default) |
| Autoregressive generation | unknown | not reached; Q1 implies the basic idea, but not tested |
| Decoding: temperature, top-k, top-p | unknown | Q6 wrong (predict): said temperature leaves probabilities unchanged |
| KV cache | solid | Q5 right (apply + why): past K and V only, valid because of the causal mask |
| Context window | unknown | not reached (cautious default) |

## Misconceptions detected
- "Temperature changes the sampling, not the probabilities" (Q6). Close to the research myth "higher temperature makes the model smarter/more creative": they don't see that temperature divides the logits before the softmax. Not re-tested (budget).
- Possibly "attention looks at surrounding tokens" (Q7 wording), i.e. the bidirectional/BERT picture, even though they answered the masking question correctly.

## Explain-it answer
> self-attention attend to itself which means gets all the scores of surrounding context tokens on how much attention the main word has.

Verdict: partly, because it has the scoring idea (a token scores the other tokens for relevance) but leaves out the output (the softmax weights blend the value vectors into a new, context-aware vector for that token) and says "surrounding" when an LLM only attends to itself and earlier tokens.

## Log
1. [Recognise] What does one forward pass produce? → "A score for every vocab token" (right)
2. [Apply] Shape of QK^T for X [N x d]? → "N x N" (right)
3. [Apply] Value in masked cells and why? → "-inf, so softmax gives 0" (right)
4. [Compare/why] Why divide by sqrt(d_k)? → "To stop softmax saturating" (right)
5. [Apply + why] What does the KV cache store and why is it safe? → "Past K and V; the mask fixes them" (right)
6. [Predict] Logits [1.2, 0.9, 0.1, -0.5], top p 0.44 at tau 1; at tau 0.1? → "Stays at 0.44" (wrong; answer: rises to about 0.95)
7. [Explain] In one sentence, what does self-attention do for a token? → see above (partly)

## Implications for the lesson
- Dwell on: what attention *outputs* (weighted sum of V → a new vector per token), told end to end in one place; softmax over logits and how temperature, top-k and top-p reshape it (use the slider with the textbook logits); how the pieces chain together (tokens → embeddings + position → blocks → LM head → sampling → loop), since the early pipeline and the block/residual stream weren't tested.
- Move fast through: next-token prediction as the objective, the causal mask mechanics, why sqrt(d_k), and the KV cache. Use them as quick interview one-liners, not slow builds.
- Quiz should target: the temperature effect (predict with numbers), top-p vs top-k, the attention output in one sentence, the shapes of logits and per-head d_k, and attention vs FFN (which one mixes across positions). Re-test the "surrounding tokens" slip with a masking-in-generation question.
