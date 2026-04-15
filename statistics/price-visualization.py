import pandas as pd
import matplotlib.pyplot as plt

# 1) Define bin order (important so x-axis stays in the order you want)
bins = [
    "0.5–1 TFLOPs",
    "1–3 TFLOPs",
    "3–5 TFLOPs",
    "5–10 TFLOPs",
    "10–50 TFLOPs",
    "50–100 TFLOPs",
    ">100 TFLOPs"
]



# 2) Long-form data: each row is a (bin, chip, price)
# Put chips ONLY in the bins where they exist
data = [
    ("0.5–1 TFLOPs", "TsingMicro 5110", 0.5),
    ("0.5–1 TFLOPs", "Hi3519A", 0.5),
    ("0.5–1 TFLOPs", "SV822", 0.5),

    ("1–3 TFLOPs", "TsingMicro 5215", 2),
    ("1–3 TFLOPs", "RV1126B", 199),
    ("3–5 TFLOPs", "A311D", 199),
    
    ("3–5 TFLOPs", "RK3576M", 199),
    ("3–5 TFLOPs", "S382", 399),
    ("3–5 TFLOPs", "AKS", 499),
    
    ("5-10 TFLOPs", "AMD Ryzen AI 400", 499),
    
    ("10-50 TFLOPs", "BM1684", 1599),
    ("10-50 TFLOPs", "310B", 1599),
    ("10-50 TFLOPs", "A1000", 1599),
    ("10-50 TFLOPs", "Jetson AGX Thor", 1599),
    
    ("50–100 TFLOPs", "Atlas 300I DUO", 12000),
    ("50–100 TFLOPs", "地平线 征程5", 12000),
    ("50–100 TFLOPs", "NVIDIA H200", 12000),
    
    (">100 TFLOPs", "AI Studio Pro", 12000),
    (">100 TFLOPs", "910B", 12000),
    (">100 TFLOPs", "MXC500", 12000),
    (">100 TFLOPs", "NVIDIA A100", 12000),
]

df_long = pd.DataFrame(data, columns=["bin", "chip", "price_usd"])

# 3) Make bin a categorical so pivot result keeps your order
df_long["bin"] = pd.Categorical(df_long["bin"], categories=bins, ordered=True)
print(df_long)

# 4) Pivot: rows=bins, columns=chips, values=price
df_wide = df_long.pivot(index="bin", columns="chip", values="price_usd")
print(df_wide)
ax = df_wide.plot(kind="bar", figsize=(20, 5))

for container in ax.containers:
    chip = container.get_label()
    color = "grey"
    for bar in container:
        bar.set_color(color)
        bar.set_edgecolor("black")
        bar.set_alpha(0.85)

ax.set_yscale("log")
ax.set_xlabel("Compute Power Bin")
ax.set_ylabel("Price (USD)")
ax.set_title("Chip Prices by Compute Power Bin (chips appear only where they exist)")
plt.xticks(rotation=25, ha="right")
plt.tight_layout()
plt.show()