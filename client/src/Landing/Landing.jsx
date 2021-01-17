import React, { useState } from 'react';

import SearchBar from './SearchBar/SearchBar';
import Results from './Results/Results';
import NavBar from './NavBar/NavBar';

import { getHostUrl } from '../Util/Utilities';

import './Landing.css';

function Landing() {

  const [results, setResults] = useState([]);
  const [isSearch, setIsSearch] = useState(false);

  const search = (e) => {
    e.preventDefault();
    console.log("Search value: ", e.target[0].value);

    var url = new URL(getHostUrl() + 'api/search/all');
    url.searchParams.append("searchKey", e.target[0].value);    

    fetch(url)
      .then(res => res.json())
      .then(data => {
        console.log(data);
        setResults(data.results);
        setIsSearch(true);

        document.getElementById("resultsPage").scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
      });
  }

  return (
    <React.Fragment>
      <NavBar />
      <div className="Landing">
        <h1>Search Your Audio History</h1>
        <SearchBar search={search} />
      </div>
      {isSearch &&
        <div className="ResultsPage" id="resultsPage">
          {results.length > 0 ? <h2>Search Results</h2> : <h3>No results found</h3>}
          <Results results={results} />
        </div>
      }
    </React.Fragment>
  );
}

export default Landing;