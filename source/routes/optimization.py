import numpy as np
import pandas as pd
import matplotlib.pyplot as plt


# Define saturating curve function
def conversions_from_spend(spend, max_conv, K):
    """
    Saturating curve: conversions = max_conv * spend / (spend + K)
    """
    return max_conv * spend / (spend + K)

# Normal sampling with clipping to bounds
def sample_param(param):
    mean = param['mean']
    std = (param['upper'] - param['lower']) / 4
    return np.clip(np.random.normal(loc=mean, scale=std), param['lower'], param['upper'])

def calculate_budget_allocation(priors, total_budget, assumptions=None):

    n_simulations = 5000

    channels = list(priors.keys())
    # Step 1: Initial equal allocation
    initial_alloc = {ch: total_budget / len(channels) for ch in channels}

    # Step 2: Monte Carlo to estimate expected conversions per channel (linear approximation)
    mean_convs = []
    for ch, budget in initial_alloc.items():
        conv_list = []
        for _ in range(n_simulations):
            cpm = sample_param(priors[ch]['CPM'])
            ctr = sample_param(priors[ch]['CTR'])
            cvr = sample_param(priors[ch]['CVR'])
            impressions = budget / cpm * 1000
            clicks = impressions * ctr
            conversions = clicks * cvr
            conv_list.append(conversions)
        mean_convs.append(np.mean(conv_list))

    mean_convs = np.array(mean_convs)

    # Step 3: Softmax allocation with minimum fraction
    min_budgets = {ch: frac * total_budget for ch, frac in assumptions.items()}
    
    sum_min_budgets = sum(min_budgets.values())

    if sum_min_budgets > total_budget:
        scale_factor = total_budget / sum_min_budgets
        min_budgets = {ch: b * scale_factor for ch, b in min_budgets.items()}
        sum_min_budgets = total_budget

    remaining_budget = total_budget - sum_min_budgets

    # Stable softmax
    max_conv_val = np.max(mean_convs)
    exp_vals = np.exp(mean_convs - max_conv_val)
    softmax_weights = exp_vals / np.sum(exp_vals)

    softmax_allocation = {
        ch: min_budgets[ch] + remaining_budget * w
        for ch, w in zip(channels, softmax_weights)
    }

    # Step 4: Monte Carlo with saturating curve
    
    # Define max_conv and K per channel (can tune these values)
    max_conv_dict = {'google': 600, 'linkedin': 200, 'meta': 150, 'tiktok': 100}
    K_dict = {'google': 2000, 'linkedin': 1000, 'meta': 800, 'tiktok': 500}

    final_channel_conversions = {ch: [] for ch in channels}
    final_total_conversions = []

    for _ in range(n_simulations):
        total_conv = 0
        for ch, budget in softmax_allocation.items():
            conversions = conversions_from_spend(budget, max_conv=max_conv_dict[ch], K=K_dict[ch])
            # Optional: add small Monte Carlo noise
            noise = np.random.normal(0, 0.05 * conversions)
            conversions += noise
            conversions = max(0, conversions)  # Ensure non-negative
            final_channel_conversions[ch].append(conversions)
            total_conv += conversions
        final_total_conversions.append(total_conv)

    # Step 5: Summarize
    summary = {}
    for ch in channels:
        conv_list = final_channel_conversions[ch]
        summary[ch] = {
            'P10': np.percentile(conv_list, 10),
            'mean': np.mean(conv_list),
            'P90': np.percentile(conv_list, 90)
        }

    summary['total'] = {
        'P10': np.percentile(final_total_conversions, 10),
        'mean': np.mean(final_total_conversions),
        'P90': np.percentile(final_total_conversions, 90)
    }

    df_summary = pd.DataFrame(summary).T

    # Output
    # print("Optimized Budget Allocation (Softmax + Saturating Curve + Minimums):")
    # for ch, budget in softmax_allocation.items():
    #     print(f"{ch}: ${budget:.2f}")

    # print("\nConversions Summary (P10, Mean, P90):")
    # print(df_summary)

    # Visualization
    # channels_plot = channels
    # means = df_summary.loc[channels_plot, 'mean']
    # lower_err = np.maximum(means - df_summary.loc[channels_plot, 'P10'], 0)
    # upper_err = np.maximum(df_summary.loc[channels_plot, 'P90'] - means, 0)
    # errors = [lower_err, upper_err]

    # plt.figure(figsize=(10,6))
    # plt.bar(channels_plot, means, yerr=errors, capsize=5, color='skyblue')
    # plt.ylabel('Expected Conversions')
    # plt.title('Optimized Funnel Conversions per Channel (Saturating Curve)')
    # plt.grid(axis='y', linestyle='--', alpha=0.6)
    # plt.show()
    return df_summary, softmax_allocation