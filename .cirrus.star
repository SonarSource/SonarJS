load("github.com/SonarSource/cirrus-modules@v3", "load_features")

def main(ctx):
    return load_features(ctx, aws=dict(cluster_name="CirrusCI-8"))
