package com.zikrelahi.api.artists;

import org.junit.jupiter.api.Test;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

import static org.junit.jupiter.api.Assumptions.assumeTrue;

class MySqlArtistRelationshipMigrationManualTest {

    @Test
    void migratesRepresentativeLegacyRowsOnDisposableMySql() {
        String url = System.getProperty("zikr.mysql.migration.url");
        assumeTrue(url != null && !url.isBlank(), "Set zikr.mysql.migration.url for disposable MySQL verification.");
        String username = System.getProperty("zikr.mysql.migration.username", "root");
        String password = System.getProperty("zikr.mysql.migration.password", "");
        MySqlArtistRelationshipMigrationTest.verifyMigration(
                new DriverManagerDataSource(url, username, password));
    }
}
