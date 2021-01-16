import './Landing.css';
import SearchBar from './SearchBar/SearchBar';
import { getHostUrl } from '../Util/Utilities';

function Landing() {

  const search = (e) => {
    e.preventDefault();
    console.log("Search value: ", e.target[0].value);

    fetch(getHostUrl() + 'api')
      .then(res => res.json())
      .then(data => {
        console.log(data);
      });
  }

  return (
    <div className="Landing">
      <h1>Search Your Audio History</h1>
      <SearchBar search={search} />
    </div>
  );
}

export default Landing;