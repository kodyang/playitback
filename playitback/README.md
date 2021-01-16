# Endpoints
## /api/status
Returns 200

## /api/searchStatic
Searches the transcript of two classic movies: the bee movie and a few good men.

### Params:
```
{
    "searchKey": string // The word or phrase you are searching for. eg "banana"
}
```

## /api/youtube/subtitles
Adds a youtube video to the index

### Params:
```
{
    "videoId": string // The videoId is the id of the youtube video. eg "x8fpeVICeGg"
}
```

## /api/search/all
Searches everything in our index.
```
{
    "searchKey": string // The string to search in our index
}
```