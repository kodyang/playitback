import React from 'react';
import './Results.css';

export default function results(props) {

  return (
    <React.Fragment>
      {props.results.map(function(result, i) {
        return (
          <div className="Result" key={result.indexId}>        
            <p className="Url">{result.url}</p>
            <h3>{result.title}</h3>
            <p>Transcript (<b>{Math.floor(result.timestamp/60)}:{result.timestamp%60}</b>): "...{result.content}..."</p>
            <div className="VideoContainer">
              <iframe
                title={result.title}
                className="Video"
                src={`https://www.youtube.com/embed/${result.id}?start=${result.timestamp}`}
                frameBorder="0"
              />
            </div>
          </div>
        )
      })}
    </React.Fragment>
  );
}