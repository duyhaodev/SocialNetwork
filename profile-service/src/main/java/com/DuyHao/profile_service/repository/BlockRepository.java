package com.DuyHao.profile_service.repository;

import com.DuyHao.profile_service.entity.Block;
import java.util.List;
import org.springframework.data.neo4j.repository.Neo4jRepository;
import org.springframework.data.neo4j.repository.query.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface BlockRepository extends Neo4jRepository<Block, String> {

    boolean existsByBlockerIdAndBlockedId(String blockerId, String blockedId);

    void deleteByBlockerIdAndBlockedId(String blockerId, String blockedId);

    List<Block> findByBlockerId(String blockerId);

    @Query("MATCH (b:block) WHERE b.blockerId = $userId RETURN b.blockedId AS blockedId "
            + "UNION MATCH (b2:block) WHERE b2.blockedId = $userId RETURN b2.blockerId AS blockedId")
    List<String> findInvolvedBlockIds(@Param("userId") String userId);
}
