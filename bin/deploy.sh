#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PIPELINE_DIR="$(dirname "$SCRIPT_DIR")"
OUTPUT_DIR="$PIPELINE_DIR/output"
WEB_DATA_DIR="$PIPELINE_DIR/../web/public/data"

echo "Deploying pipeline outputs to web/public/data..."
echo "  Source: $OUTPUT_DIR"
echo "  Destination: $WEB_DATA_DIR"

if [ ! -d "$OUTPUT_DIR" ]; then
    echo "Error: Output directory does not exist: $OUTPUT_DIR"
    exit 1
fi

mkdir -p "$WEB_DATA_DIR"

if [ -f "$OUTPUT_DIR/model_inputs.csv" ]; then
    cp "$OUTPUT_DIR/model_inputs.csv" "$WEB_DATA_DIR/"
    echo "  Copied: model_inputs.csv"
fi

if [ -f "$OUTPUT_DIR/validation_report.csv" ]; then
    cp "$OUTPUT_DIR/validation_report.csv" "$WEB_DATA_DIR/"
    echo "  Copied: validation_report.csv"
fi

echo "Done!"
