import React from 'react'
import Header from '../../component/header/header';
import Sidebar from '../../component/sidebar/sidebar';

const Home = () => {
  return (
    <div>
        <div>
            {/* header */}
            <Header/>

            {/* sidebar */}
            <Sidebar/>
        </div>
    </div>
  )
}

export default Home;