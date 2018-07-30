#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "${DIR}"
export ES_URL=${ES_URL:-http://localhost:9200}
export ES_HTTP_AUTH=${ES_HTTP_AUTH:-admin:changeme}
export ES_INDEX=${ES_INDEX:-json}

if [ -n "$CHANGE_SFALGO_MAPPING" ]; then
  # Delete the existing sfalgo index
  curl -viH "Content-Type: application/json" -sXDELETE -u ${ES_HTTP_AUTH} $ES_URL'/sfalgo'

  # Create an index mapping for sfalgo index so that epoch DateTime field is treated as a date
  curl -viH "Content-Type: application/json" -sXPUT -u ${ES_HTTP_AUTH} $ES_URL'/sfalgo' --data-binary '{
    "mappings": {
      "_doc": {
        "properties": {
          "DateTime": {
            "type":   "date",
            "format": "yyyy-MM-dd HH:mm:ss||yyyy-MM-dd||epoch_millis"
          }
        }
      }
    }
  }'

  # Insert seed data
  curl -viH "Content-Type: application/json" -sXPOST -u ${ES_HTTP_AUTH} $ES_URL'/sfalgo/_doc' --data-binary '{
    "DateTime": 1523387640161,
    "Status": 1
  }'
fi

exec nodejs server.js $@
